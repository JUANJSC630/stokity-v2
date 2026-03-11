<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TicketSettingController extends Controller
{
    public function edit(): Response
    {
        $settings = BusinessSetting::getSettings();

        return Inertia::render('settings/ticket', [
            'config'   => $settings->getTicketConfig(),
            'business' => [
                'name'            => $settings->name,
                'nit'             => $settings->nit,
                'address'         => $settings->address,
                'phone'           => $settings->phone,
                'currency_symbol' => $settings->currency_symbol ?? '$',
                'logo_url'        => $settings->logo_url,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            // Shared
            'paper_width'         => 'required|in:58,80',
            'header_size'         => 'required|in:normal,large',
            'show_logo'           => 'boolean',
            'show_nit'            => 'boolean',
            'show_address'        => 'boolean',
            'show_phone'          => 'boolean',
            // Sale
            'show_seller'         => 'boolean',
            'show_branch'         => 'boolean',
            'show_tax'            => 'boolean',
            'footer_line1'        => 'nullable|string|max:60',
            'footer_line2'        => 'nullable|string|max:60',
            'sale_code_graphic'   => 'nullable|in:none,qr,barcode',
            // Return
            'return_show_seller'  => 'boolean',
            'return_show_branch'  => 'boolean',
            'return_show_reason'  => 'boolean',
            'return_footer_line1' => 'nullable|string|max:60',
            'return_footer_line2' => 'nullable|string|max:60',
            'return_code_graphic' => 'nullable|in:none,qr,barcode',
        ]);

        // Cast int
        $validated['paper_width'] = (int) $validated['paper_width'];

        BusinessSetting::getSettings()->update(['ticket_config' => $validated]);

        return back()->with('success', 'Plantilla del ticket guardada.');
    }
}
