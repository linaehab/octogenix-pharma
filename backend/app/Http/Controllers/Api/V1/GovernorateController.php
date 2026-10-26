<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\GovernorateResource;
use App\Models\Governorate;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class GovernorateController extends Controller
{
    /** All 27 governorates; non-deliverable ones are listed so forms can explain why. */
    public function __invoke(): AnonymousResourceCollection
    {
        return GovernorateResource::collection(Governorate::query()->ordered()->get());
    }
}
