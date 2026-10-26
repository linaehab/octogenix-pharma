<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Models\Setting;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Typed access to the settings registry (config/settings.php) backed by the settings table.
 * Values are cached as one map and the cache is cleared whenever a value changes.
 */
class SettingsService
{
    public const CACHE_KEY = 'settings.values';

    /** @return array<string, array{group: string, type: string, public: bool, default: mixed, min?: int, max?: int}> */
    public function registry(): array
    {
        return config('settings');
    }

    /** @return array<string, mixed> Every registered key with its stored value, or its default if no row exists. */
    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $stored = Setting::query()->pluck('value', 'key')->all();

            $values = [];
            foreach ($this->registry() as $key => $definition) {
                $values[$key] = array_key_exists($key, $stored) ? $stored[$key] : $definition['default'];
            }

            return $values;
        });
    }

    public function get(string $key): mixed
    {
        if (! array_key_exists($key, $this->registry())) {
            throw new \InvalidArgumentException("Unknown setting [{$key}].");
        }

        return $this->all()[$key];
    }

    /** @return array<string, mixed> Only the settings Angular may read. */
    public function publicValues(): array
    {
        $public = array_filter($this->registry(), fn (array $definition) => $definition['public']);

        return array_intersect_key($this->all(), $public);
    }

    /**
     * Validates and saves several settings at once. All-or-nothing: if any value is invalid,
     * nothing is saved.
     *
     * @param  array<string, mixed>  $input  setting key => new value
     *
     * @throws ValidationException
     */
    public function update(array $input, ?AdminUser $admin = null): void
    {
        $registry = $this->registry();
        $errors = [];
        $values = [];

        foreach ($input as $key => $value) {
            if (! array_key_exists($key, $registry)) {
                $errors["settings.{$key}"] = ['This setting does not exist.'];

                continue;
            }

            $value = $this->prepare($registry[$key]['type'], $value);
            $validator = Validator::make(['value' => $value], $this->rules($registry[$key]), [], ['value' => $key]);

            if ($validator->fails()) {
                $errors["settings.{$key}"] = $validator->errors()->all();

                continue;
            }

            $values[$key] = $this->cast($registry[$key]['type'], $value);
        }

        $errors += $this->crossFieldErrors(array_replace($this->all(), $values));

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($values, $registry, $admin) {
            foreach ($values as $key => $value) {
                Setting::query()->updateOrCreate(['key' => $key], [
                    'group' => $registry[$key]['group'],
                    'type' => $registry[$key]['type'],
                    'is_public' => $registry[$key]['public'],
                    'value' => $value,
                    'updated_by_admin_id' => $admin?->id,
                ]);
            }
        });

        $this->flush();
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** Normalise input before validation (trim/lower-case emails, E.164 phones). */
    private function prepare(string $type, mixed $value): mixed
    {
        return match ($type) {
            'email' => is_string($value) ? Str::lower(trim($value)) : $value,
            'email_list' => is_array($value)
                ? array_values(array_unique(array_map(fn ($v) => is_string($v) ? Str::lower(trim($v)) : $v, $value)))
                : $value,
            'phone_list' => is_array($value)
                ? array_map(fn ($v) => is_string($v) ? (PhoneNumber::normalize($v) ?? $v) : $v, $value)
                : $value,
            'string', 'url' => is_string($value) ? (trim($value) === '' ? null : trim($value)) : $value,
            default => $value,
        };
    }

    /** @return array<string, list<mixed>> */
    private function rules(array $definition): array
    {
        return match ($definition['type']) {
            'string' => ['value' => ['nullable', 'string', 'max:255']],
            'email' => ['value' => ['nullable', 'string', 'email', 'max:255']],
            'email_list' => ['value' => ['present', 'array', 'max:20'], 'value.*' => ['string', 'email', 'max:255']],
            'phone_list' => ['value' => ['present', 'array', 'max:10'], 'value.*' => ['string', 'regex:/^\+[1-9]\d{6,14}$/']],
            'url' => ['value' => ['nullable', 'string', 'url:https', 'max:500']],
            'boolean' => ['value' => ['required', 'boolean']],
            'integer' => ['value' => [
                'required', 'integer', 'min:'.($definition['min'] ?? 0), 'max:'.($definition['max'] ?? PHP_INT_MAX),
            ]],
            'money' => ['value' => ['nullable', 'integer', 'min:0', 'max:4294967295']],
        };
    }

    private function cast(string $type, mixed $value): mixed
    {
        return match ($type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $value,
            'money' => $value === null ? null : (int) $value,
            default => $value,
        };
    }

    /**
     * Rules that depend on more than one setting (design v0.3 §5.B).
     *
     * @param  array<string, mixed>  $values  the settings as they would be after saving
     * @return array<string, list<string>>
     */
    private function crossFieldErrors(array $values): array
    {
        $errors = [];
        $cardDrivers = array_keys(config('payments.drivers', []));

        if ($values['store.cod_enabled'] && $values['store.cod_fee_piastres'] === null) {
            $errors['settings.store.cod_enabled'][] = 'Set the COD fee (0 is allowed) before enabling cash on delivery.';
        }

        if ($values['store.card_provider'] !== null && ! in_array($values['store.card_provider'], $cardDrivers, true)) {
            $errors['settings.store.card_provider'][] = 'This card payment provider is not available.';
        }

        if ($values['store.card_payments_enabled'] && ! in_array($values['store.card_provider'], $cardDrivers, true)) {
            $errors['settings.store.card_payments_enabled'][] = 'A configured card payment provider is required before enabling card payments.';
        }

        return $errors;
    }
}
