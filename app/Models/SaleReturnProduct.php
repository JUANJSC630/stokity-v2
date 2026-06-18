<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleReturnProduct extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'sale_return_id',
        'product_id',
        'quantity',
        'effective_price',
    ];

    public function saleReturn()
    {
        return $this->belongsTo(SaleReturn::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
