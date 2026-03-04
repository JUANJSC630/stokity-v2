<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
use App\Models\Sale;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PosController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $branches = $user->isAdmin()
            ? Branch::where('status', true)->get()
            : Branch::where('id', $user->branch_id)->get();

        $clients = Client::orderBy('name')->get(['id', 'name', 'document']);

        $pendingSalesCount = Sale::where('status', 'pending')
            ->when(!$user->isAdmin() && $user->branch_id, fn($q) => $q->where('branch_id', $user->branch_id))
            ->count();

        return Inertia::render('pos/index', [
            'branches'          => $branches,
            'clients'           => $clients,
            'pendingSalesCount' => $pendingSalesCount,
        ]);
    }
}
