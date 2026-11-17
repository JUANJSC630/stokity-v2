<?php

namespace App\Console\Commands;

use App\Models\BlobDeletion;
use App\Services\BlobReferences;
use App\Services\BlobStorageService;
use App\Tenancy\TenantManager;
use Illuminate\Console\Command;

/**
 * Second half of the deferred delete (BlobStorageService::scheduleDelete()):
 * deletes queued files whose grace period has passed, re-checking first that
 * nothing references them any more. A file that got referenced again in the
 * meantime (cover restored, product restored from the trash) is kept and its
 * queue row dropped.
 */
class PurgeBlobs extends Command
{
    /** After this many failed attempts a row stops being retried and is reported. */
    private const MAX_ATTEMPTS = 5;

    protected $signature = 'blobs:purge
                            {--limit=200 : Maximum queued files to process in this run}
                            {--dry-run : Report what would be deleted without deleting anything}';

    protected $description = 'Delete queued Vercel Blob files that are past their grace period and no longer referenced';

    public function handle(BlobStorageService $blob, BlobReferences $references, TenantManager $tenants): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $due = BlobDeletion::query()
            ->with('tenant')
            ->where('delete_after', '<=', now())
            ->where('attempts', '<', self::MAX_ATTEMPTS)
            ->orderBy('delete_after')
            ->limit((int) $this->option('limit'))
            ->get();

        $counts = ['deleted' => 0, 'kept' => 0, 'failed' => 0];

        foreach ($due as $row) {
            if ($references->isReferenced($row->url)) {
                $counts['kept']++;
                $dryRun || $row->delete();

                continue;
            }

            if ($dryRun) {
                $this->line("Would delete {$row->url}");
                $counts['deleted']++;

                continue;
            }

            $deleted = $row->tenant
                ? $tenants->runAs($row->tenant, fn () => $blob->delete($row->url))
                : false;

            if ($deleted) {
                $counts['deleted']++;
                $row->delete();
            } else {
                $counts['failed']++;
                $row->increment('attempts');
            }
        }

        $this->info(($dryRun ? '[dry-run] ' : '')."Deleted {$counts['deleted']}, kept {$counts['kept']} still referenced, {$counts['failed']} failed.");

        return self::SUCCESS;
    }
}
