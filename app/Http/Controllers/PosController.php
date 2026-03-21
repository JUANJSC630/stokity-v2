<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Category;
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

        $clients = Client::orderBy('name')->limit(500)->get(['id', 'name', 'document']);

        $pendingSalesCount = Sale::where('status', 'pending')
            ->when(!$user->isAdmin() && $user->branch_id, fn($q) => $q->where('branch_id', $user->branch_id))
            ->count();

        $settings       = BusinessSetting::getSettings();
        $currentSession = $user->branch_id
            ? CashSession::getOpenForUser($user->id, $user->branch_id)
            : null;

        $categories = Category::orderBy('name')->get(['id', 'name']);

        return Inertia::render('pos/index', [
            'branches'           => $branches,
            'clients'            => $clients,
            'categories'         => $categories,
            'pendingSalesCount'  => $pendingSalesCount,
            'currentSession'     => $currentSession,
            'requireCashSession' => (bool) $settings->require_cash_session,
        ]);
    }
}
