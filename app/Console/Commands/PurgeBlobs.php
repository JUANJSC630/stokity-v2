<?php

namespace App\Console\Commands;

use App\Models\BlobDeletion;
use App\Services\BlobReferences;
use App\Services\BlobStorageService;
use App\Tenancy\TenantManager;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

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

        $counts = ['deleted' => 0, 'kept' => 0, 'failed' => 0, 'skipped' => 0];

        foreach ($due as $snapshot) {
            $outcome = $dryRun
                ? $this->dryRunOutcome($snapshot, $references)
                : DB::transaction(fn () => $this->purge($snapshot->id, $blob, $references, $tenants));

            $counts[$outcome]++;
        }

        $this->info(($dryRun ? '[dry-run] ' : '')."Deleted {$counts['deleted']}, kept {$counts['kept']} still referenced, {$counts['failed']} failed, {$counts['skipped']} rescheduled meanwhile.");

        return self::SUCCESS;
    }

    /**
     * The queue row is re-read under a lock and kept locked until the file is
     * gone: the batch above is only a snapshot, so a row rescheduled (new grace
     * period) or taken out of the queue (URL referenced again, see
     * BlobStorageService::unscheduleDelete()) since then is skipped, and a
     * writer re-referencing this URL waits for the purge to finish.
     *
     * @return 'deleted'|'kept'|'failed'|'skipped'
     */
    private function purge(int $id, BlobStorageService $blob, BlobReferences $references, TenantManager $tenants): string
    {
        $row = BlobDeletion::query()->with('tenant')->whereKey($id)->lockForUpdate()->first();

        if (! $row || $row->delete_after->isFuture() || $row->attempts >= self::MAX_ATTEMPTS) {
            return 'skipped';
        }

        if ($references->isReferenced($row->url)) {
            $row->delete();

            return 'kept';
        }

        $deleted = $row->tenant
            ? $tenants->runAs($row->tenant, fn () => $blob->delete($row->url))
            : false;

        if (! $deleted) {
            $row->increment('attempts');

            return 'failed';
        }

        $row->delete();

        return 'deleted';
    }

    /**
     * @return 'deleted'|'kept'
     */
    private function dryRunOutcome(BlobDeletion $row, BlobReferences $references): string
    {
        if ($references->isReferenced($row->url)) {
            return 'kept';
        }

        $this->line("Would delete {$row->url}");

        return 'deleted';
    }
}
