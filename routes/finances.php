<?php

use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ExpenseTemplateController;
use App\Http\Controllers\FinanceController;
use App\Http\Middleware\AdminOrManagerMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', AdminOrManagerMiddleware::class])->group(function () {
    // Dashboard financiero (P&L)
    Route::get('/finances', [FinanceController::class, 'summary'])->name('finances.summary');

    // Gastos
    Route::get('/expenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/expenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::put('/expenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');

    // Plantillas de gastos fijos
    Route::get('/expense-templates', [ExpenseTemplateController::class, 'index'])->name('expense-templates.index');
    Route::post('/expense-templates', [ExpenseTemplateController::class, 'store'])->name('expense-templates.store');
    Route::put('/expense-templates/{expenseTemplate}', [ExpenseTemplateController::class, 'update'])->name('expense-templates.update');
    Route::delete('/expense-templates/{expenseTemplate}', [ExpenseTemplateController::class, 'destroy'])->name('expense-templates.destroy');

    // Categorías de gasto (gestión CRUD)
    Route::get('/expense-categories', [ExpenseCategoryController::class, 'index'])->name('expense-categories.index');
    Route::post('/expense-categories', [ExpenseCategoryController::class, 'store'])->name('expense-categories.store');
    Route::put('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update'])->name('expense-categories.update');
    Route::delete('/expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy'])->name('expense-categories.destroy');
});
