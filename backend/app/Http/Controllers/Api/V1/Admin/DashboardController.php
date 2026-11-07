<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Services\DashboardSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Dashboard overview. Open to every active admin; the service leaves out the blocks of
 * sections the admin has no permission for.
 */
class DashboardController extends Controller
{
    public function summary(Request $request, DashboardSummaryService $dashboard): JsonResponse
    {
        /** @var AdminUser $admin */
        $admin = $request->user('admin');

        return response()->json(['data' => $dashboard->summary($admin)]);
    }
}
