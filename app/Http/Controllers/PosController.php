<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Client;
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

        return Inertia::render('pos/index', [
            'branches' => $branches,
            'clients'  => $clients,
        ]);
    }
}
