<?php

namespace App\Content;

use App\Enums\Site;
use InvalidArgumentException;

/**
 * Read-only access to resources/content/{site}.php: the editable entries and lists that
 * exist for each site. The registry, not the database, decides what can be edited.
 */
class ContentRegistry
{
    /** @var array<string, array{entries: array<string, array>, lists: array<string, array>}> */
    private array $loaded = [];

    /** Maximum lengths for text entries, by type. */
    public const MAX_LENGTH = ['text' => 255, 'textarea' => 2000];

    /** @return array<string, array{group: string, type: string, en?: string, ar?: string, image?: string}> */
    public function entries(Site $site): array
    {
        return $this->load($site)['entries'];
    }

    /** @return array<string, array{group: string, fields: list<string>, required: list<string>, min: int, max: int, icons?: list<string>}> */
    public function lists(Site $site): array
    {
        return $this->load($site)['lists'];
    }

    /** @return array{group: string, fields: list<string>, required: list<string>, min: int, max: int} */
    public function list(Site $site, string $listKey): array
    {
        return $this->lists($site)[$listKey]
            ?? throw new InvalidArgumentException("Unknown list [{$listKey}] for site [{$site->value}].");
    }

    public function hasList(Site $site, string $listKey): bool
    {
        return array_key_exists($listKey, $this->lists($site));
    }

    private function load(Site $site): array
    {
        return $this->loaded[$site->value] ??= require resource_path("content/{$site->value}.php");
    }
}
