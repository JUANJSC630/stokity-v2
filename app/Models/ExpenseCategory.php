<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    use HasFactory;
    protected $fillable = ['name', 'icon', 'color', 'is_system'];

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
