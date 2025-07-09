<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

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
     * @var array<int, string>
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
     *
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->role === 'administrador';
    }
    
    /**
     * Check if the user is a manager.
     *
     * @return bool
     */
    public function isManager(): bool
    {
        return $this->role === 'encargado';
    }

    /**
     * Check if the user is a seller.
     *
     * @return bool
     */
    public function isSeller(): bool
    {
        return $this->role === 'vendedor';
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
     *
     * @return string
     */
    public function getPhotoUrlAttribute(): string
    {
        // Hay una foto guardada
        if ($this->photo) {
            $path = 'uploads/users/' . $this->photo;
            
            // Verificar si el archivo existe
            if (file_exists(public_path($path))) {
                // Agregamos un timestamp para evitar problemas de caché
                return asset($path) . '?v=' . filemtime(public_path($path));
            }
        }
        
        // Devolver imagen por defecto
        return asset('stokity-icon.png');
    }
    
    /**
     * Update the last login timestamp.
     *
     * @return void
     */
    public function updateLastLogin(): void
    {
        $this->update([
            'last_login_at' => now(),
        ]);
    }
}
