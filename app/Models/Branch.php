<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string|null $business_name
 * @property string|null $address
 * @property string|null $phone
 * @property string|null $email
 * @property bool $status
 * @property \App\Models\User|null $manager
 */
class Branch extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'business_name',
        'address',
        'phone',
        'email',
        'status',
        'manager_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'boolean',
    ];

    /**
     * Get the manager of the branch.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Get the employees of the branch.
     */
    public function employees(): HasMany
    {
        return $this->hasMany(User::class, 'branch_id');
    }
    
    /**
     * Get the products of the branch.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
