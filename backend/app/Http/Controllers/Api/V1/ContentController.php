<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Site;
use App\Http\Controllers\Controller;
use App\Services\ContentService;
use Illuminate\Http\JsonResponse;

class ContentController extends Controller
{
    /**
     * Everything editable on one site in a single response, loaded once when Angular starts:
     * { data: { texts: {key: {en, ar}}, images: {key: {url, url_ar}}, lists: {list_key: [...]} } }
     */
    public function show(Site $site, ContentService $content): JsonResponse
    {
        return response()->json(['data' => $content->publicPayload($site)]);
    }
}
