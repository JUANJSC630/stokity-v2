<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $name
 * @property string|null $icon
 * @property string|null $color
 * @property bool $is_system
 */
class ExpenseCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['name', 'icon', 'color', 'is_system', 'deleted_by', 'deletion_reason'];

    protected $casts = ['is_system' => 'boolean'];

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function templates(): HasMany
    {
        return $this->hasMany(ExpenseTemplate::class);
    }
}
