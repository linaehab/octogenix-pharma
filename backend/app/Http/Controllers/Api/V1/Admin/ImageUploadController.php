<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\ImagePath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Uploads an image and returns its path, which the client then saves on a content entry,
 * list item, brand or service. SVG is not accepted (it can carry scripts).
 */
class ImageUploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120',
                'dimensions:max_width=6000,max_height=6000'],
        ]);

        $file = $request->file('image');
        $extension = $file->extension() === 'jpeg' ? 'jpg' : $file->extension();

        // Generated name and folder: the client's file name is never used on disk.
        $path = $file->storeAs(
            ImagePath::UPLOAD_DIRECTORY.'/'.now()->format('Y/m'),
            Str::uuid()->toString().'.'.$extension,
            ImagePath::DISK,
        );

        return response()->json(['data' => ['path' => $path, 'url' => ImagePath::url($path)]], 201);
    }
}
