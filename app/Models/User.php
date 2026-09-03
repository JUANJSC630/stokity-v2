<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role
 * @property int|null $branch_id
 * @property bool $status
 * @property string|null $photo
 * @property string $photo_url
 * @property \App\Models\Branch|null $branch
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use BelongsToTenant, HasFactory, HasRoles, Notifiable, SoftDeletes;

    /** Platform owner role: tenant_id is NULL and access is the /admin panel. */
    public const ROLE_SUPER_ADMIN = 'super_admin';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'role',
        'branch_id',
        'status',
        'photo',
        'password',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'photo_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'boolean',
        ];
    }

    /**
     * Check if the user is an admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'administrador';
    }

    /**
     * Check if the user is a manager.
     */
    public function isManager(): bool
    {
        return $this->role === 'encargado';
    }

    /**
     * Check if the user is a seller.
     */
    public function isSeller(): bool
    {
        return $this->role === 'vendedor';
    }

    /**
     * Platform owner: belongs to no tenant, manages every tenant from /admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    private ?string $dataScopeCache = null;

    /**
     * The data axis (§6.4 of ROLES_PERMISSIONS_ARCHITECTURE.md): 'all' sees
     * every branch, 'branch' only their own, 'own' only records they created
     * (narrowed further per-resource by a dedicated permission, e.g.
     * cash_sessions.view_all — this method never returns 'own' itself).
     *
     * Read from the user's Spatie role (assigned by roles:assign-legacy).
     * Falls back to the legacy role string for a tenant that hasn't run that
     * migration yet, so behavior never changes for someone not yet migrated.
     *
     * Memoized on the instance: several controllers call this (or
     * isRestrictedToOwnBranch()) more than once per request, and each call
     * would otherwise re-run the model_has_roles join query.
     *
     * By design a user holds exactly one role (see ROLES_PERMISSIONS_
     * ARCHITECTURE.md §3.3 / DefaultRoleProvisioner) — `orderBy('id')` is
     * just a deterministic tiebreaker if that's ever violated by hand, not a
     * "pick the most permissive role" policy.
     */
    public function dataScope(): string
    {
        if ($this->dataScopeCache !== null) {
            return $this->dataScopeCache;
        }

        if ($this->isSuperAdmin()) {
            return $this->dataScopeCache = 'all';
        }

        /** @var \App\Models\Role|null $role */
        $role = $this->roles()->orderBy('roles.id')->first();

        if ($role) {
            return $this->dataScopeCache = $role->data_scope;
        }

        return $this->dataScopeCache = $this->isAdmin() ? 'all' : 'branch';
    }

    /**
     * True for anyone who must be filtered to their own branch — the exact
     * inverse of today's `! $user->isAdmin()` branch-filter checks, now
     * backed by the role's data_scope instead of a hardcoded role string.
     */
    public function isRestrictedToOwnBranch(): bool
    {
        return $this->dataScope() !== 'all';
    }

    /**
     * Get the branches managed by the user.
     */
    public function managedBranches(): HasMany
    {
        return $this->hasMany(Branch::class, 'manager_id');
    }

    /**
     * Get the branch the user belongs to.
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the photo URL attribute.
     */
    public function getPhotoUrlAttribute(): string
    {
        if ($this->photo) {
            // Vercel Blob URL (new uploads)
            if (str_starts_with($this->photo, 'http')) {
                return $this->photo;
            }

            // Legacy local file
            $path = 'uploads/users/'.$this->photo;
            if (file_exists(public_path($path))) {
                return asset($path).'?v='.filemtime(public_path($path));
            }
        }

        return asset('stokity-icon.png');
    }

    /**
     * Update the last login timestamp.
     */
    public function updateLastLogin(): void
    {
        $this->update([
            'last_login_at' => now(),
        ]);
    }
}
