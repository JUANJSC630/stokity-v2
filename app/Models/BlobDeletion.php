<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A Vercel Blob file queued for deletion (see BlobStorageService::scheduleDelete()).
 *
 * Deliberately not tenant-scoped: `blobs:purge` walks every tenant's queue at
 * once and switches into each row's tenant only to prove it owns the URL.
 *
 * @property int $id
 * @property int|null $tenant_id
 * @property string $url
 * @property string $url_hash
 * @property \Illuminate\Support\Carbon $delete_after
 * @property int $attempts
 */
class BlobDeletion extends Model
{
    protected $fillable = [
        'tenant_id',
        'url',
        'url_hash',
        'delete_after',
        'attempts',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'delete_after' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
