<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Tenant;
use Illuminate\Console\Command;

/**
 * Category slugs are stable on purpose (they are public URLs on the
 * storefront); this is the deliberate way to recompute one from the current
 * name after a rename. Run it only if the storefront can cope with the old
 * URL disappearing.
 */
class RegenerateCategorySlug extends Command
{
    protected $signature = 'store:categories:regenerate-slug
                            {tenant : Tenant slug or id}
                            {category : Category id}';

    protected $description = 'Recompute a category slug from its current name (changes its public URL)';

    public function handle(): int
    {
        $identifier = (string) $this->argument('tenant');
        $tenant = Tenant::query()->where('slug', $identifier)->orWhere('id', ctype_digit($identifier) ? (int) $identifier : 0)->first();

        if (! $tenant) {
            $this->error("No existe el negocio '{$identifier}'.");

            return self::FAILURE;
        }

        $category = Category::allTenants()->withTrashed()->where('tenant_id', $tenant->id)->find($this->argument('category'));

        if (! $category) {
            $this->error('Ese negocio no tiene esa categoría.');

            return self::FAILURE;
        }

        $old = $category->slug;
        $category->regenerateSlug();

        $this->info($old === $category->slug ? "El slug ya era '{$old}'." : "Slug cambiado: '{$old}' → '{$category->slug}'.");

        return self::SUCCESS;
    }
}
