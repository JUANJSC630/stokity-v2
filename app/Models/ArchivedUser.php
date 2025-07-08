<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArchivedUser extends Model
{
    use HasFactory;
    
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'name',
        'email',
        'role',
        'branch_id',
        'status',
        'photo',
        'archived_at',
        'archive_reason',
        'archived_by',
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'archived_at' => 'datetime',
        'status' => 'boolean',
    ];
    
    /**
     * Get the original user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    /**
     * Get the user who archived this user.
     */
    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
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
        return $this->photo
            ? asset('uploads/users/' . $this->photo)
            : asset('stokity-icon.png');
    }
}
