<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;

class ExpenseCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            ExpenseCategory::orderBy('name')->get(['id', 'name', 'icon', 'color', 'is_system'])
        );
    }
}
