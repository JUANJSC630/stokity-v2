<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'code',
        'client_id',
        'seller_id',
        'tax',
        'net',
        'total',
        'payment_method',
        'date',
        'status',
    ];

    protected $casts = [
        'date' => 'datetime',
        'tax' => 'decimal:2',
        'net' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function saleProducts()
    {
        return $this->hasMany(SaleProduct::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'sale_products')
            ->withPivot(['quantity', 'price', 'subtotal'])
            ->withTimestamps();
    }
}
