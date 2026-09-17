<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StoreInfoResource;
use App\Models\BusinessSetting;
use Illuminate\Http\Request;

class StoreInfoController extends Controller
{
    public function show(Request $request): StoreInfoResource
    {
        // Read-only variant on purpose: an anonymous storefront request must
        // never be able to trigger a row-create side effect (see the
        // method's own docblock — getSettings() would create one).
        return new StoreInfoResource(BusinessSetting::getSettingsReadOnly());
    }
}
