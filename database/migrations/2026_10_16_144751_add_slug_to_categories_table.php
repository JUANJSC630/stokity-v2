<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Safe to run twice: each step checks whether it already happened.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('categories', 'slug')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->string('slug', 100)->nullable()->after('name');
            });
        }

        $this->backfill();

        if (! Schema::hasIndex('categories', 'categories_tenant_id_slug_unique')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->unique(['tenant_id', 'slug']);
            });
        }
    }

    /**
     * Gives every category without a slug one, oldest first so the earliest
     * category of a name keeps the clean slug ("ropa") and later namesakes get
     * a suffix ("ropa-2"). Soft-deleted categories count too: their slug stays
     * reserved so restoring one can never collide. Categories that already have
     * a slug are never touched.
     */
    private function backfill(): void
    {
        $taken = DB::table('categories')
            ->whereNotNull('slug')
            ->get(['tenant_id', 'slug'])
            ->groupBy('tenant_id')
            ->map(fn ($rows) => $rows->pluck('slug')->flip()->all())
            ->all();

        DB::table('categories')->whereNull('slug')->orderBy('id')->get(['id', 'tenant_id', 'name'])->each(function ($category) use (&$taken) {
            $base = Str::slug($category->name) ?: 'categoria';
            $slug = $base;
            $attempt = 2;

            while (isset($taken[$category->tenant_id][$slug])) {
                $slug = "{$base}-{$attempt}";
                $attempt++;
            }

            $taken[$category->tenant_id][$slug] = true;

            DB::table('categories')->where('id', $category->id)->update(['slug' => $slug]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->dropColumn('slug');
        });
    }
};
