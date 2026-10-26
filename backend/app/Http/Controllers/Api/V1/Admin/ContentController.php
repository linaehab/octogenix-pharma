<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Content\ContentRegistry;
use App\Enums\ContentType;
use App\Enums\Site;
use App\Http\Controllers\Controller;
use App\Models\ContentEntry;
use App\Models\ContentItem;
use App\Services\ContentService;
use App\Support\ImagePath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Routes require the content.manage permission. */
class ContentController extends Controller
{
    public function __construct(
        private readonly ContentRegistry $registry,
        private readonly ContentService $content,
    ) {}

    /** The dashboard editor for one site: entries grouped by section, and every list with all its items. */
    public function show(Site $site): JsonResponse
    {
        $rows = ContentEntry::query()->where('site', $site->value)->get()->keyBy('key');

        $groups = [];
        foreach ($this->registry->entries($site) as $key => $definition) {
            $row = $rows->get($key);
            $entry = ['key' => $key, 'type' => $definition['type']];

            if ($definition['type'] === ContentType::Image->value) {
                $path = $row ? $row->image_path : $definition['image'];
                $entry += [
                    'image_path' => $path,
                    'image_ar_path' => $row?->image_ar_path,
                    'image_url' => ImagePath::url($path),
                    'image_ar_url' => ImagePath::url($row?->image_ar_path),
                ];
            } else {
                $entry += [
                    'max_length' => ContentRegistry::MAX_LENGTH[$definition['type']],
                    'value_en' => $row ? $row->value_en : $definition['en'],
                    'value_ar' => $row ? $row->value_ar : $definition['ar'],
                ];
            }

            $entry['updated_at'] = $row?->updated_at?->toIso8601String();
            $groups[$definition['group']][] = $entry;
        }

        $lists = [];
        foreach ($this->registry->lists($site) as $listKey => $definition) {
            $lists[] = [
                'key' => $listKey,
                'group' => $definition['group'],
                'fields' => $definition['fields'],
                'required' => $definition['required'],
                'min' => $definition['min'],
                'max' => $definition['max'],
                'items' => ContentItem::query()->inList($site, $listKey)->ordered()->get()
                    ->map(fn (ContentItem $item) => [
                        ...$this->content->itemPayload($item, $definition['fields']),
                        'is_active' => $item->is_active,
                        'image_path' => $item->image_path,
                        'secondary_image_path' => $item->secondary_image_path,
                    ])->all(),
            ];
        }

        $data = [];
        foreach ($groups as $group => $entries) {
            $data[] = ['group' => $group, 'entries' => $entries];
        }

        return response()->json(['data' => ['site' => $site->value, 'groups' => $data, 'lists' => $lists]]);
    }

    /** Body: { "entries": { "<key>": { "value_en": "...", "value_ar": "..." } | { "image_path": "..." } } } */
    public function updateEntries(Request $request, Site $site): JsonResponse
    {
        $request->validate(['entries' => ['required', 'array', 'min:1']]);

        $this->content->updateEntries($site, $request->input('entries'), $request->user('admin'));

        return $this->show($site);
    }

    public function storeItem(Request $request, Site $site, string $listKey): JsonResponse
    {
        abort_unless($this->registry->hasList($site, $listKey), 404);

        $item = $this->content->createItem($site, $listKey, $request->all(), $request->user('admin'));

        return $this->itemResponse($item, 201);
    }

    public function updateItem(Request $request, ContentItem $contentItem): JsonResponse
    {
        $item = $this->content->updateItem($contentItem, $request->all(), $request->user('admin'));

        return $this->itemResponse($item);
    }

    public function destroyItem(ContentItem $contentItem): JsonResponse
    {
        $this->content->deleteItem($contentItem);

        return response()->json(null, 204);
    }

    /** Body: { "ids": [3, 1, 2] } — every item of the list in the new order. */
    public function reorder(Request $request, Site $site, string $listKey): JsonResponse
    {
        abort_unless($this->registry->hasList($site, $listKey), 404);
        $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);

        $this->content->reorder($site, $listKey, $request->input('ids'));

        return response()->json(null, 204);
    }

    private function itemResponse(ContentItem $item, int $status = 200): JsonResponse
    {
        $definition = $this->registry->list($item->site, $item->list_key);

        return response()->json(['data' => [
            ...$this->content->itemPayload($item, $definition['fields']),
            'list_key' => $item->list_key,
            'is_active' => $item->is_active,
            'sort_order' => $item->sort_order,
        ]], $status);
    }
}
