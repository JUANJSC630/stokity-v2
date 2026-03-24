<?php

use App\Models\Branch;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpenseTemplate;
use App\Models\User;

beforeEach(function () {
    $this->branch = Branch::factory()->create(['status' => true]);
    $this->admin = adminUser($this->branch);
    $this->manager = User::factory()->create(['role' => 'encargado', 'branch_id' => $this->branch->id]);
    $this->seller = User::factory()->create(['role' => 'vendedor',  'branch_id' => $this->branch->id]);
    $this->category = ExpenseCategory::factory()->create();
});

describe('Expense CRUD', function () {
    it('admin can create an expense', function () {
        $this->actingAs($this->admin)
            ->post(route('expenses.store'), [
                'branch_id' => $this->branch->id,
                'expense_category_id' => $this->category->id,
                'amount' => 150000,
                'description' => 'Factura EPM',
                'expense_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        expect(Expense::where('description', 'Factura EPM')->exists())->toBeTrue();
    });

    it('encargado can create an expense for their branch', function () {
        $this->actingAs($this->manager)
            ->post(route('expenses.store'), [
                'branch_id' => $this->branch->id,
                'amount' => 50000,
                'expense_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        expect(Expense::where('branch_id', $this->branch->id)->exists())->toBeTrue();
    });

    it('encargado cannot create expense for another branch', function () {
        $other = Branch::factory()->create(['status' => true]);

        $this->actingAs($this->manager)
            ->post(route('expenses.store'), [
                'branch_id' => $other->id,
                'amount' => 50000,
                'expense_date' => now()->toDateString(),
            ])
            ->assertForbidden();
    });

    it('vendedor cannot access expenses (redirected)', function () {
        $this->actingAs($this->seller)
            ->get(route('expenses.index'))
            ->assertRedirect(); // AdminOrManagerMiddleware redirects to dashboard
    });

    it('admin can delete an expense', function () {
        $expense = Expense::factory()->create(['branch_id' => $this->branch->id]);

        $this->actingAs($this->admin)
            ->delete(route('expenses.destroy', $expense))
            ->assertRedirect();

        expect(Expense::find($expense->id))->toBeNull();
    });

    it('rejects amount below 1', function () {
        $this->actingAs($this->admin)
            ->post(route('expenses.store'), [
                'branch_id' => $this->branch->id,
                'amount' => 0,
                'expense_date' => now()->toDateString(),
            ])
            ->assertSessionHasErrors('amount');
    });

    it('bulk store creates multiple expenses from templates', function () {
        $template = ExpenseTemplate::factory()->create([
            'branch_id' => $this->branch->id,
            'reference_amount' => 200000,
        ]);

        $this->actingAs($this->admin)
            ->post(route('expenses.store'), [
                'expenses' => [
                    [
                        'branch_id' => $this->branch->id,
                        'expense_template_id' => $template->id,
                        'amount' => 210000,
                        'expense_date' => now()->toDateString(),
                    ],
                ],
            ])
            ->assertRedirect();

        expect(Expense::where('expense_template_id', $template->id)->exists())->toBeTrue();
    });
});
