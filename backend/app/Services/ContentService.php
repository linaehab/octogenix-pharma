<?php

namespace App\Services;

use App\Content\ContentRegistry;
use App\Enums\ContentType;
use App\Enums\Site;
use App\Models\AdminUser;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use App\Rules\PlainText;
use App\Rules\ValidImagePath;
use App\Support\ImagePath;
use App\Support\Localized;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Editable page content (design v0.3 §6): texts and images keyed like the Angular translation
 * keys, plus repeating lists. The registry defines what exists; this service validates edits
 * and builds the cached payload the Angular app loads once at start-up.
 */
class ContentService
{
    public function __construct(private readonly ContentRegistry $registry) {}

    public static function cacheKey(Site $site): string
    {
        return "content.{$site->value}";
    }

    /**
     * @return array{texts: array<string, array{en: ?string, ar: ?string}>,
     *               images: array<string, array{url: ?string, url_ar: ?string}>,
     *               lists: array<string, list<array<string, mixed>>>}
     */
    public function publicPayload(Site $site): array
    {
        return Cache::rememberForever(self::cacheKey($site), function () use ($site) {
            $rows = ContentEntry::query()->where('site', $site->value)->get()->keyBy('key');
            $texts = [];
            $images = [];

            foreach ($this->registry->entries($site) as $key => $definition) {
                $row = $rows->get($key);

                if ($definition['type'] === ContentType::Image->value) {
                    $path = $row ? $row->image_path : $definition['image'];
                    $images[$key] = [
                        'url' => ImagePath::url($path),
                        'url_ar' => ImagePath::url($row?->image_ar_path) ?? ImagePath::url($path),
                    ];
                } else {
                    $texts[$key] = $row
                        ? ['en' => $row->value_en, 'ar' => $row->value_ar]
                        : ['en' => $definition['en'], 'ar' => $definition['ar']];
                }
            }

            $lists = [];
            foreach ($this->registry->lists($site) as $listKey => $definition) {
                $lists[$listKey] = ContentItem::query()
                    ->inList($site, $listKey)
                    ->where('is_active', true)
                    ->ordered()
                    ->get()
                    ->map(fn (ContentItem $item) => $this->itemPayload($item, $definition['fields']))
                    ->all();
            }

            return ['texts' => $texts, 'images' => $images, 'lists' => $lists];
        });
    }

    /** Only the fields the list's registry definition uses. */
    public function itemPayload(ContentItem $item, array $fields): array
    {
        $payload = ['id' => $item->id];

        foreach ($fields as $field) {
            $payload[$field] = match ($field) {
                'image', 'secondary_image' => ['url' => ImagePath::url($item->{ContentItem::FIELD_COLUMNS[$field][0]})],
                'icon' => $item->icon,
                'link' => $item->link_url,
                default => Localized::pair($item, $field),
            };
        }

        return $payload;
    }

    /**
     * Saves several entries at once (all-or-nothing).
     *
     * @param  array<string, array<string, mixed>>  $input  key => { value_en, value_ar } or { image_path, image_ar_path }
     *
     * @throws ValidationException
     */
    public function updateEntries(Site $site, array $input, ?AdminUser $admin): void
    {
        $definitions = $this->registry->entries($site);
        $errors = [];
        $updates = [];

        foreach ($input as $key => $values) {
            $definition = $definitions[$key] ?? null;

            if ($definition === null) {
                $errors["entries.{$key}"] = ['This content entry does not exist.'];

                continue;
            }

            $values = is_array($values) ? $values : [];
            $validator = Validator::make($values, $this->entryRules($definition['type']), [], [
                'value_en' => "{$key} (English)", 'value_ar' => "{$key} (Arabic)",
                'image_path' => "{$key} image", 'image_ar_path' => "{$key} Arabic image",
            ]);

            if ($validator->fails()) {
                foreach ($validator->errors()->messages() as $field => $messages) {
                    $errors["entries.{$key}.{$field}"] = $messages;
                }

                continue;
            }

            $updates[$key] = ['group' => $definition['group'], 'type' => $definition['type'], ...$validator->validated()];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($site, $updates, $admin) {
            foreach ($updates as $key => $values) {
                ContentEntry::query()->updateOrCreate(
                    ['site' => $site->value, 'key' => $key],
                    [...$values, 'updated_by_admin_id' => $admin?->id],
                );
            }
        });

        $this->flush($site);
    }

    /** @return array<string, list<mixed>> */
    private function entryRules(string $type): array
    {
        if ($type === ContentType::Image->value) {
            return [
                'image_path' => ['required', 'string', new ValidImagePath],
                'image_ar_path' => ['sometimes', 'nullable', 'string', new ValidImagePath],
            ];
        }

        $max = ContentRegistry::MAX_LENGTH[$type];

        return Localized::rules('value', ['required', 'string', "max:{$max}", new PlainText]);
    }

    /**
     * @param  array<string, mixed>  $input
     *
     * @throws ValidationException
     */
    public function createItem(Site $site, string $listKey, array $input, ?AdminUser $admin): ContentItem
    {
        $definition = $this->registry->list($site, $listKey);
        $data = $this->validateItem($definition, $input, creating: true);

        return DB::transaction(function () use ($site, $listKey, $definition, $data, $admin) {
            $items = ContentItem::query()->inList($site, $listKey)->lockForUpdate()->get();

            if ($items->count() >= $definition['max']) {
                throw ValidationException::withMessages([
                    'list' => "This list can hold at most {$definition['max']} items.",
                ]);
            }

            $item = ContentItem::create([
                ...$data,
                'site' => $site->value,
                'list_key' => $listKey,
                'sort_order' => ($items->max('sort_order') ?? -1) + 1,
                'updated_by_admin_id' => $admin?->id,
            ]);

            $this->flush($site);

            return $item;
        });
    }

    /**
     * @param  array<string, mixed>  $input
     *
     * @throws ValidationException
     */
    public function updateItem(ContentItem $item, array $input, ?AdminUser $admin): ContentItem
    {
        $definition = $this->registry->list($item->site, $item->list_key);
        $data = $this->validateItem($definition, $input, creating: false);

        DB::transaction(function () use ($item, $definition, $data, $admin) {
            if (($data['is_active'] ?? true) === false && $item->is_active) {
                $this->assertMinimumRemains($item, $definition['min']);
            }

            $item->update([...$data, 'updated_by_admin_id' => $admin?->id]);
        });

        $this->flush($item->site);

        return $item;
    }

    /** @throws ValidationException */
    public function deleteItem(ContentItem $item): void
    {
        $definition = $this->registry->list($item->site, $item->list_key);

        DB::transaction(function () use ($item, $definition) {
            if ($item->is_active) {
                $this->assertMinimumRemains($item, $definition['min']);
            }

            $item->delete();
        });

        $this->flush($item->site);
    }

    /**
     * @param  list<int>  $ids  every item of the list, in the new order
     *
     * @throws ValidationException
     */
    public function reorder(Site $site, string $listKey, array $ids): void
    {
        $this->registry->list($site, $listKey);

        DB::transaction(function () use ($site, $listKey, $ids) {
            $existing = ContentItem::query()->inList($site, $listKey)->lockForUpdate()->pluck('id')->sort()->values()->all();
            $given = collect($ids)->map(fn ($id) => (int) $id)->sort()->values()->all();

            if ($existing !== $given) {
                throw ValidationException::withMessages(['ids' => 'Send every item of this list exactly once.']);
            }

            foreach (array_values($ids) as $position => $id) {
                ContentItem::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });

        $this->flush($site);
    }

    public function flush(Site $site): void
    {
        Cache::forget(self::cacheKey($site));
    }

    /** @throws ValidationException */
    private function assertMinimumRemains(ContentItem $item, int $min): void
    {
        $active = ContentItem::query()->inList($item->site, $item->list_key)
            ->where('is_active', true)->lockForUpdate()->count();

        if ($active - 1 < $min) {
            throw ValidationException::withMessages([
                'list' => "This list needs at least {$min} active item(s).",
            ]);
        }
    }

    /**
     * Validates an item against its list definition. Fields the list does not use are rejected.
     *
     * @return array<string, mixed> column => value
     *
     * @throws ValidationException
     */
    private function validateItem(array $definition, array $input, bool $creating): array
    {
        $rules = ['is_active' => ['sometimes', 'boolean']];
        $allowedColumns = ['is_active'];

        foreach ($definition['fields'] as $field) {
            $required = in_array($field, $definition['required'], true);
            $presence = $creating && $required ? 'required' : ($required ? 'sometimes|required' : 'sometimes|nullable');

            foreach (ContentItem::FIELD_COLUMNS[$field] as $column) {
                $allowedColumns[] = $column;
                $rules[$column] = [...explode('|', $presence), ...$this->itemColumnRules($field)];
            }

            // Lists whose icon picks one of the component's built-in graphics.
            if ($field === 'icon' && isset($definition['icons'])) {
                $rules['icon'][] = Rule::in($definition['icons']);
            }
        }

        $unknown = array_diff(array_keys($input), $allowedColumns);
        $validator = Validator::make($input, $rules);
        $validator->after(function ($validator) use ($unknown) {
            foreach ($unknown as $column) {
                $validator->errors()->add($column, 'This field is not used by this list.');
            }
        });

        return $validator->validate();
    }

    /** @return list<mixed> */
    private function itemColumnRules(string $field): array
    {
        return match ($field) {
            'image', 'secondary_image' => ['string', new ValidImagePath],
            'description' => ['string', 'max:2000', new PlainText],
            'icon' => ['string', 'max:20', new PlainText],
            // An Angular route ("/about", not "//host") or an https URL.
            'link' => ['string', 'max:500', 'regex:#^(/(?!/)[^\s]*|https://[^\s]+)$#'],
            default => ['string', 'max:255', new PlainText],
        };
    }
}
