<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use App\Http\Resources\Store\StorePaymentMethodResource;
use App\Models\PaymentMethod;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StorePaymentMethodController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return StorePaymentMethodResource::collection(PaymentMethod::getActive());
    }
}
