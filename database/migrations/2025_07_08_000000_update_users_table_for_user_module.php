<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if branch_id column doesn't exist before adding it
        if (!Schema::hasColumn('users', 'branch_id')) {
            Schema::table('users', function (Blueprint $table) {
                // Add branch_id field - nullable because admin doesn't need a branch
                $table->foreignId('branch_id')->nullable()->after('role')->constrained('branches')->nullOnDelete();
            });
        }
        
        // Add status field if it doesn't exist
        if (!Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('status')->default(true)->after(Schema::hasColumn('users', 'branch_id') ? 'branch_id' : 'role');
            });
        }
        
        // Add photo field if it doesn't exist
        if (!Schema::hasColumn('users', 'photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('photo')->nullable()->after('status');
            });
        }
        
        // Add last_login field if it doesn't exist
        if (!Schema::hasColumn('users', 'last_login_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('last_login_at')->nullable()->after('remember_token');
            });
        }
        
        // Add soft delete if it doesn't exist
        if (!Schema::hasColumn('users', 'deleted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->softDeletes();
            });
        }
        
        // Update the role field to have proper default and comment
        Schema::table('users', function (Blueprint $table) {
            // Modify role field to support the new roles
            $table->string('role')->default('vendedor')->comment('Valores: administrador, encargado, vendedor')->change();
        });
        
        // Create archived_users table for soft deleted users
        Schema::create('archived_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('name');
            $table->string('email');
            $table->string('role');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->boolean('status');
            $table->string('photo')->nullable();
            $table->timestamp('archived_at');
            $table->text('archive_reason')->nullable();
            $table->foreignId('archived_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archived_users');
        
        if (Schema::hasColumn('users', 'deleted_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
        
        if (Schema::hasColumn('users', 'last_login_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('last_login_at');
            });
        }
        
        if (Schema::hasColumn('users', 'photo')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('photo');
            });
        }
        
        if (Schema::hasColumn('users', 'status')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
        
        if (Schema::hasColumn('users', 'branch_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }
        
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('user')->change();
        });
    }
};
