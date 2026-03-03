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
        'ticket_config',
    ];

    protected $casts = [
        'ticket_config' => 'array',
    ];

    /** Default ticket template configuration. */
    public const TICKET_DEFAULTS = [
        'paper_width'  => 58,
        'header_size'  => 'large',
        'show_logo'    => false,
        'show_nit'     => true,
        'show_address' => true,
        'show_phone'   => true,
        'show_seller'  => true,
        'show_branch'  => true,
        'show_tax'     => true,
        'footer_line1' => '¡Gracias por su compra!',
        'footer_line2' => 'Vuelva pronto',
    ];

    /** Returns the merged ticket config (DB values override defaults). */
    public function getTicketConfig(): array
    {
        return array_merge(self::TICKET_DEFAULTS, $this->ticket_config ?? []);
    }

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
        if ($this->logo) {
            // Vercel Blob URL (new uploads)
            if (str_starts_with($this->logo, 'http')) {
                return $this->logo;
            }

            // Legacy local file
            $path = public_path('uploads/business/' . $this->logo);
            if (file_exists($path)) {
                return asset('uploads/business/' . $this->logo);
            }
        }

        return asset('stokity-icon.png');
    }
}
