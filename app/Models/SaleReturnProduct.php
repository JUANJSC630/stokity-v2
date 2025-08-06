<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleReturnProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'sale_return_id',
        'product_id',
        'quantity',
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
