<?php

namespace App\Enums;

/**
 * How a piece was made — one of the facts Colombian consumer law (Ley 1480,
 * art. 50) requires a seller to disclose. Exposed on the public storefront API.
 */
enum ProductManufacturing: string
{
    case Handmade = 'handmade';
    case Supplier = 'supplier';
    case Mixed = 'mixed';
}
