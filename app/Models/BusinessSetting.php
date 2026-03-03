<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessSetting extends Model
{
    protected $fillable = [
        'name',
        'logo',
        'nit',
        'phone',
        'email',
        'address',
        'currency_symbol',
    ];

    protected $appends = ['logo_url'];

    /**
     * Returns the single business settings row, creating it with defaults if it doesn't exist.
     */
    public static function getSettings(): self
    {
        return static::first() ?? static::create([
            'name'            => config('app.name', 'Mi Negocio'),
            'currency_symbol' => '$',
        ]);
    }

    /**
     * Get the public URL for the business logo.
     */
    public function getLogoUrlAttribute(): string
    {
        if ($this->logo && file_exists(public_path('uploads/business/' . $this->logo))) {
            return asset('uploads/business/' . $this->logo);
        }

        return asset('stokity-icon.png');
    }
}
