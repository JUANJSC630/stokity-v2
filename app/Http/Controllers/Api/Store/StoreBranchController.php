<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreBranchResource;
use App\Models\Branch;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoreBranchController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $branches = Branch::where('status', true)->orderBy('name')->get();

        return StoreBranchResource::collection($branches);
    }
}
