<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'document',
        'phone',
        'address',
        'email',
        'birthdate',
        'is_wholesale',
        'wholesale_discount_pct',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'is_wholesale' => 'boolean',
        'wholesale_discount_pct' => 'decimal:2',
    ];

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }
}
