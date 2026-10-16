<?php

namespace App\Console\Commands;

use App\Models\TenantApiKey;
use Illuminate\Console\Command;

/**
 * Retires a storefront API key (second half of a zero-downtime rotation).
 * Idempotent: revoking an already revoked key just reports it.
 */
class RevokeStoreApiKey extends Command
{
    protected $signature = 'store:keys:revoke {id : Id of the key (shown by store:keys:create)}';

    protected $description = 'Revoke a storefront API key';

    public function handle(): int
    {
        $key = TenantApiKey::allTenants()->find($this->argument('id'));

        if (! $key) {
            $this->error('No existe esa llave.');

            return self::FAILURE;
        }

        if ($key->isRevoked()) {
            $this->info("La llave {$key->name} ya estaba desactivada.");

            return self::SUCCESS;
        }

        $key->revoke();
        $this->info("Llave {$key->name} (id {$key->id}, {$key->key_prefix}…) desactivada.");

        return self::SUCCESS;
    }
}
