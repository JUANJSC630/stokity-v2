<?php

use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseTemplate;

beforeEach(function () {
    $this->branch  = Branch::factory()->create(['status' => true]);
    $this->admin   = adminUser($this->branch);
    $this->manager = \App\Models\User::factory()->create(['role' => 'encargado', 'branch_id' => $this->branch->id]);
});

describe('ExpenseTemplate', function () {
    it('admin can create a template', function () {
        $this->actingAs($this->admin)
            ->post(route('expense-templates.store'), [
                'branch_id'        => $this->branch->id,
                'name'             => 'Arriendo local',
                'reference_amount' => 1200000,
            ])
            ->assertRedirect();

        expect(ExpenseTemplate::where('name', 'Arriendo local')->exists())->toBeTrue();
    });

    it('isRegisteredForMonth returns false when no expense exists for that month', function () {
        $template = ExpenseTemplate::factory()->create(['branch_id' => $this->branch->id]);

        expect($template->isRegisteredForMonth(now()->year, now()->month))->toBeFalse();
    });

    it('isRegisteredForMonth returns true after expense is registered', function () {
        $template = ExpenseTemplate::factory()->create(['branch_id' => $this->branch->id]);

        Expense::factory()->create([
            'expense_template_id' => $template->id,
            'branch_id'           => $this->branch->id,
            'expense_date'        => now()->startOfMonth(),
        ]);

        expect($template->isRegisteredForMonth(now()->year, now()->month))->toBeTrue();
    });

    it('encargado cannot manage templates from another branch', function () {
        $other    = Branch::factory()->create(['status' => true]);
        $template = ExpenseTemplate::factory()->create(['branch_id' => $other->id]);

        $this->actingAs($this->manager)
            ->delete(route('expense-templates.destroy', $template))
            ->assertForbidden();
    });

    it('admin can toggle template inactive', function () {
        $template = ExpenseTemplate::factory()->create([
            'branch_id'  => $this->branch->id,
            'is_active'  => true,
        ]);

        $this->actingAs($this->admin)
            ->put(route('expense-templates.update', $template), [
                'name'             => $template->name,
                'reference_amount' => $template->reference_amount,
                'is_active'        => false,
            ])
            ->assertRedirect();

        expect($template->fresh()->is_active)->toBeFalse();
    });
});
