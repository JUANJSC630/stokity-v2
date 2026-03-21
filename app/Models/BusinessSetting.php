<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BusinessSetting extends Model
{
    use HasFactory;

    private const CACHE_KEY = 'business_settings';
    private const CACHE_TTL = 3600; // 1 hour

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
    }
    protected $fillable = [
        'name',
        'logo',
        'default_product_image',
        'nit',
        'phone',
        'email',
        'address',
        'currency_symbol',
        'require_cash_session',
        'ticket_config',
    ];

    protected $casts = [
        'ticket_config' => 'array',
    ];

    /** Default ticket template configuration. */
    public const TICKET_DEFAULTS = [
        // ── Shared (header) ───────────────────────────────────────────────────
        'paper_width'         => 58,
        'header_size'         => 'large',
        'show_logo'           => false,
        'show_nit'            => true,
        'show_address'        => true,
        'show_phone'          => true,
        // ── Sale ticket ───────────────────────────────────────────────────────
        'show_seller'         => true,
        'show_branch'         => true,
        'show_tax'            => true,
        'footer_line1'        => '¡Gracias por su compra!',
        'footer_line2'        => 'Vuelva pronto',
        'sale_code_graphic'   => 'none',   // none | qr | barcode
        // ── Return ticket ─────────────────────────────────────────────────────
        'return_show_seller'  => true,
        'return_show_branch'  => true,
        'return_show_reason'  => true,
        'return_footer_line1' => 'Devolución procesada.',
        'return_footer_line2' => 'Gracias por su preferencia.',
        'return_code_graphic' => 'none',   // none | qr | barcode
    ];

    /** Returns the merged ticket config (DB values override defaults). */
    public function getTicketConfig(): array
    {
        return array_merge(self::TICKET_DEFAULTS, $this->ticket_config ?? []);
    }

    protected $appends = ['logo_url', 'default_product_image_url'];

    /**
     * Returns the single business settings row, creating it with defaults if it doesn't exist.
     */
    public static function getSettings(): self
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return static::first() ?? static::create([
                'name'            => config('app.name', 'Mi Negocio'),
                'currency_symbol' => '$',
            ]);
        });
    }

    /**
     * Get the public URL for the default product image.
     */
    public function getDefaultProductImageUrlAttribute(): ?string
    {
        if ($this->default_product_image) {
            return $this->default_product_image;
        }

        // Legacy local file fallback
        $path = public_path('uploads/default-product.png');
        if (file_exists($path)) {
            return asset('uploads/default-product.png');
        }

        return null;
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
