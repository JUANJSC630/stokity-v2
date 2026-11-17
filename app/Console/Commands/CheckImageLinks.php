<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Sends a HEAD request to every product cover and gallery image and records
 * the answer in `image_ok` / `image_checked_at`, so a photo whose file was
 * deleted shows up in the panel and the Store API instead of silently
 * rendering as a broken image.
 *
 * Only a definite "gone" (404 or 410) marks an image broken. Timeouts and 5xx
 * answers are treated as unknown and leave the previous state, so a Vercel
 * hiccup during the nightly run never flags a whole catalog as broken.
 */
class CheckImageLinks extends Command
{
    private const BATCH_SIZE = 10;

    protected $signature = 'images:check-links
                            {--tenant= : Only check this tenant ID; omit to check every tenant}';

    protected $description = 'Check that every product cover and gallery image URL still exists';

    public function handle(): int
    {
        $tenantId = $this->option('tenant');

        /** @var \Illuminate\Support\Collection<int, Model> $rows */
        $rows = Product::withoutGlobalScopes()->withTrashed()
            ->when($tenantId, fn ($query) => $query->where('tenant_id', $tenantId))
            ->where('image', 'like', 'https://%')
            ->get(['id', 'tenant_id', 'image', 'image_ok', 'image_checked_at'])
            ->concat(
                ProductImage::withoutGlobalScopes()
                    ->when($tenantId, fn ($query) => $query->where('tenant_id', $tenantId))
                    ->get(['id', 'tenant_id', 'product_id', 'image', 'image_ok', 'image_checked_at'])
            );

        $results = $this->checkUrls($rows->pluck('image')->unique()->values()->all());
        $broken = 0;

        foreach ($rows as $row) {
            $ok = $results[$row->getAttribute('image')] ?? null;

            if ($ok === null) {
                continue;
            }

            $broken += $ok ? 0 : 1;
            $this->record($row, $ok);
        }

        $this->info('Checked '.count($results).' URLs: '.$broken.' broken image references.');

        return self::SUCCESS;
    }

    /**
     * @param  list<string>  $urls
     * @return array<string, bool|null> true = exists, false = gone, null = unknown
     */
    private function checkUrls(array $urls): array
    {
        $results = [];

        foreach (array_chunk($urls, self::BATCH_SIZE) as $batch) {
            $responses = Http::pool(fn (Pool $pool) => array_map(
                fn (string $url) => $pool->as($url)->timeout(10)->head($url),
                $batch,
            ));

            foreach ($batch as $url) {
                $response = $responses[$url] ?? null;
                $results[$url] = match (true) {
                    ! $response instanceof Response => null,
                    $response->successful() => true,
                    in_array($response->status(), [404, 410], true) => false,
                    default => null,
                };
            }
        }

        return $results;
    }

    /**
     * Writes are conditional on the row still holding the URL that was
     * checked: if the cover changed while the requests were in flight, the
     * stale answer is dropped instead of overwriting the new photo's health.
     *
     * A change of state moves updated_at (and, for a gallery image, its
     * product's), so storefronts syncing with `updated_since` pick it up; an
     * unchanged state only refreshes the check time and touches nothing else.
     */
    private function record(Model $row, bool $ok): void
    {
        $query = $row->newQueryWithoutScopes()
            ->whereKey($row->getKey())
            ->where('image', $row->getAttribute('image'));

        if ($row->getAttribute('image_ok') === $ok) {
            $query->toBase()->update(['image_checked_at' => now()]);

            return;
        }

        $changed = $query->update(['image_ok' => $ok, 'image_checked_at' => now()]);

        if ($changed && $row instanceof ProductImage) {
            Product::withoutGlobalScopes()->whereKey($row->product_id)->touch();
        }
    }
}
