<?php

use App\Authorization\DefaultRoleProvisioner;
use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\CreditSale;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use App\Support\PaymentMethodGroup;
use App\Tenancy\TenantManager;
use Carbon\Carbon;
use Database\Seeders\PermissionSeeder;
use Spatie\Permission\Models\Role;

/**
 * What the dashboard "Pulso del día" needs from the server: today's sales by payment
 * family, the state of the user's cash session, overdue credits and how the month is
 * going against the previous one. Real tenant, real Spatie roles, real HTTP.
 */
uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-10-15 12:00:00'));
    $this->seed(PermissionSeeder::class);
    $this->tenant = Tenant::create(['name' => 'Acme', 'slug' => 'acme', 'status' => 'active']);
    app(DefaultRoleProvisioner::class)->seedFor($this->tenant);

    $this->branch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Centro', 'business_name' => 'Acme Centro', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));
    $this->otherBranch = app(TenantManager::class)->runAs($this->tenant, fn () => Branch::create([
        'name' => 'Norte', 'business_name' => 'Acme Norte', 'address' => 'x', 'phone' => 'x', 'status' => true,
    ]));
    $this->admin = dashboardUser($this->tenant, $this->branch, 'administrador', DefaultRoleProvisioner::ADMINISTRADOR);
    $this->seller = dashboardUser($this->tenant, $this->branch, 'vendedor', DefaultRoleProvisioner::VENDEDOR);
});

afterEach(function () {
    Carbon::setTestNow();
    app(TenantManager::class)->forget();
});

function dashboardUser(Tenant $tenant, Branch $branch, string $legacyRole, string $spatieRole): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $legacyRole, $spatieRole) {
        $user = User::create([
            'name' => ucfirst($legacyRole), 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => $legacyRole, 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($spatieRole);

        return $user;
    });
}

function dashboardCustomUser(Tenant $tenant, Branch $branch, array $permissions): User
{
    return app(TenantManager::class)->runAs($tenant, function () use ($branch, $permissions) {
        $role = Role::create(['name' => 'Custom '.uniqid(), 'guard_name' => 'web'])->syncPermissions($permissions);
        $user = User::create([
            'name' => 'Custom', 'email' => uniqid().'@acme.test', 'password' => bcrypt('x'),
            'role' => 'encargado', 'branch_id' => $branch->id, 'status' => true, 'email_verified_at' => now(),
        ]);
        $user->assignRole($role);

        return $user;
    });
}

function dashboardSale(array $attributes = []): Sale
{
    return app(TenantManager::class)->runAs(test()->tenant, fn () => Sale::factory()->create(array_merge([
        'branch_id' => test()->branch->id,
        'status' => 'completed',
        'payment_method' => 'cash',
        'total' => 10000,
        'date' => now(),
    ], $attributes)));
}

function dashboardProps(User $user): array
{
    return test()->actingAs($user)->get(route('dashboard'))->viewData('page')['props'];
}

function dashboardCredit(array $attributes = []): CreditSale
{
    return app(TenantManager::class)->runAs(test()->tenant, fn () => CreditSale::create(array_merge([
        'client_id' => \App\Models\Client::factory()->create()->id,
        'branch_id' => test()->branch->id,
        'seller_id' => test()->admin->id,
        'code' => 'CR-'.uniqid(),
        'type' => CreditSale::TYPE_DUE_DATE,
        'total_amount' => 100000,
        'amount_paid' => 0,
        'balance' => 100000,
        'due_date' => now()->subDays(3),
        'status' => CreditSale::STATUS_ACTIVE,
    ], $attributes)));
}

describe('payment families', function () {
    it('groups every payment code the way the cash reports do', function (string $code, string $group) {
        expect(PaymentMethodGroup::of($code))->toBe($group);
    })->with([
        ['cash', 'cash'], ['efectivo', 'cash'],
        ['credit_card', 'card'], ['debit_card', 'card'], ['tarjeta_credito', 'card'],
        ['nequi', 'transfer'], ['transfer', 'transfer'], ['pse', 'transfer'], ['bancolombia', 'transfer'],
        ['cheque', 'other'], ['credito', 'other'], ['', 'other'],
    ]);
});

describe('paymentBreakdown', function () {
    it('adds up today\'s completed sales by method, and the parts equal today\'s revenue', function () {
        dashboardSale(['total' => 30000, 'payment_method' => 'cash']);
        dashboardSale(['total' => 20000, 'payment_method' => 'cash']);
        dashboardSale(['total' => 15000, 'payment_method' => 'credit_card']);
        dashboardSale(['total' => 5000, 'payment_method' => 'nequi']);

        $props = dashboardProps($this->admin);
        $rows = collect($props['paymentBreakdown']);

        expect($rows->firstWhere('method', 'cash'))->toMatchArray(['group' => 'cash', 'count' => 2, 'total' => 50000.0])
            ->and($rows->firstWhere('method', 'credit_card'))->toMatchArray(['group' => 'card', 'count' => 1, 'total' => 15000.0])
            ->and($rows->firstWhere('method', 'nequi'))->toMatchArray(['group' => 'transfer', 'count' => 1, 'total' => 5000.0])
            ->and($rows->sum('total'))->toBe((float) $props['metrics']['total_revenue_today']);
    });

    it('ignores other days, pending, cancelled and deleted sales', function () {
        dashboardSale(['total' => 10000]);
        dashboardSale(['total' => 9999, 'date' => now()->subDay()]);
        dashboardSale(['total' => 9999, 'status' => 'pending']);
        dashboardSale(['total' => 9999, 'status' => 'cancelled']);
        dashboardSale(['total' => 9999])->delete();

        $rows = collect(dashboardProps($this->admin)['paymentBreakdown']);

        expect($rows)->toHaveCount(1)->and($rows->first()['total'])->toBe(10000.0);
    });

    it('is empty on a day without sales', function () {
        expect(dashboardProps($this->admin)['paymentBreakdown'])->toBe([]);
    });

    it('keeps a restricted user to their own branch while an administrator sees every branch', function () {
        dashboardSale(['total' => 10000]);
        dashboardSale(['total' => 7000, 'branch_id' => $this->otherBranch->id]);

        $sellerRows = collect(dashboardProps($this->seller)['paymentBreakdown']);
        $adminProps = dashboardProps($this->admin);

        expect($sellerRows->sum('total'))->toBe(10000.0)
            ->and(collect($adminProps['paymentBreakdown'])->sum('total'))->toBe(17000.0)
            ->and(collect($adminProps['paymentBreakdown'])->sum('total'))->toBe((float) $adminProps['metrics']['total_revenue_today']);
    });
});

describe('cashSession', function () {
    it('tells the user their cash session is open, with when it was opened', function () {
        app(TenantManager::class)->runAs($this->tenant, fn () => CashSession::factory()->create([
            'branch_id' => $this->branch->id, 'opened_by_user_id' => $this->seller->id, 'opened_at' => now()->subHours(4),
        ]));

        $session = dashboardProps($this->seller)['cashSession'];

        expect($session['open'])->toHaveKeys(['id', 'opened_at'])
            ->and(Carbon::parse($session['open']['opened_at'])->equalTo(now()->subHours(4)))->toBeTrue();
    });

    it('does not show somebody else\'s session, nor a closed one', function () {
        app(TenantManager::class)->runAs($this->tenant, function () {
            CashSession::factory()->create(['branch_id' => $this->branch->id, 'opened_by_user_id' => $this->admin->id]);
            CashSession::factory()->closed()->create(['branch_id' => $this->branch->id, 'opened_by_user_id' => $this->seller->id]);
        });

        expect(dashboardProps($this->seller)['cashSession']['open'])->toBeNull();
    });

    it('says whether the business requires an open cash session', function () {
        app(TenantManager::class)->runAs($this->tenant, fn () => BusinessSetting::factory()->create(['require_cash_session' => true]));

        expect(dashboardProps($this->seller)['cashSession']['required'])->toBeTrue();
    });

    it('is not sent to a user who can neither sell nor see cash sessions', function () {
        $viewer = dashboardCustomUser($this->tenant, $this->branch, ['dashboard.view']);

        expect(dashboardProps($viewer)['cashSession'])->toBeNull();
    });
});

describe('overdueCredits', function () {
    it('counts and adds up the overdue credits, including active ones already past due', function () {
        dashboardCredit(['status' => CreditSale::STATUS_OVERDUE, 'balance' => 40000]);
        dashboardCredit(['status' => CreditSale::STATUS_ACTIVE, 'balance' => 25000, 'due_date' => now()->subDay()]);

        expect(dashboardProps($this->admin)['overdueCredits'])->toBe(['count' => 2, 'balance' => 65000.0]);
    });

    it('leaves out credits that are not overdue', function () {
        dashboardCredit(['due_date' => now()->addDays(5)]);
        dashboardCredit(['status' => CreditSale::STATUS_COMPLETED, 'balance' => 0]);
        dashboardCredit(['status' => CreditSale::STATUS_CANCELLED]);
        dashboardCredit(['balance' => 0]);

        expect(dashboardProps($this->admin)['overdueCredits'])->toBe(['count' => 0, 'balance' => 0.0]);
    });

    it('keeps a restricted user to their own branch', function () {
        dashboardCredit();
        dashboardCredit(['branch_id' => $this->otherBranch->id]);

        expect(dashboardProps($this->seller)['overdueCredits']['count'])->toBe(1)
            ->and(dashboardProps($this->admin)['overdueCredits']['count'])->toBe(2);
    });

    it('is not sent to a user who cannot see credits', function () {
        $viewer = dashboardCustomUser($this->tenant, $this->branch, ['dashboard.view']);
        dashboardCredit();

        expect(dashboardProps($viewer)['overdueCredits'])->toBeNull();
    });

    it('is not sent when the credits module is off', function () {
        app(TenantManager::class)->runAs($this->tenant, fn () => BusinessSetting::factory()->create(['module_config' => ['credits' => false]]));
        dashboardCredit();

        expect(dashboardProps($this->admin)['overdueCredits'])->toBeNull();
    });
});

describe('previousMonth', function () {
    it('gives last month\'s revenue and what it was at the same point of the month', function () {
        dashboardSale(['total' => 100000, 'date' => '2026-10-02 10:00:00']);
        dashboardSale(['total' => 40000, 'date' => '2026-09-05 10:00:00']);
        dashboardSale(['total' => 15000, 'date' => '2026-09-15 23:30:00']);
        dashboardSale(['total' => 60000, 'date' => '2026-09-20 10:00:00']);
        dashboardSale(['total' => 99999, 'date' => '2026-09-10 10:00:00', 'status' => 'cancelled']);

        $previous = dashboardProps($this->admin)['previousMonth'];

        expect($previous['revenue'])->toBe(115000.0)
            ->and($previous['revenue_same_period'])->toBe(55000.0);
    });

    it('still finds the previous month on the 31st (Carbon\'s subMonth would land on the current month)', function () {
        Carbon::setTestNow(Carbon::parse('2026-03-31 12:00:00'));
        dashboardSale(['total' => 30000, 'date' => '2026-02-10 09:00:00']);
        dashboardSale(['total' => 70000, 'date' => '2026-03-05 09:00:00']);

        expect(dashboardProps($this->admin)['previousMonth']['revenue'])->toBe(30000.0);
    });

    it('caps the same period at the end of a shorter previous month', function () {
        Carbon::setTestNow(Carbon::parse('2026-03-31 12:00:00'));
        dashboardSale(['total' => 30000, 'date' => '2026-02-28 18:00:00']);

        $previous = dashboardProps($this->admin)['previousMonth'];

        expect($previous['revenue'])->toBe(30000.0)->and($previous['revenue_same_period'])->toBe(30000.0);
    });
});

it('keeps every prop the dashboard already had', function () {
    dashboardSale(['total' => 12000]);

    $props = dashboardProps($this->admin);

    expect($props)->toHaveKeys(['metrics', 'growth', 'topProducts', 'salesByBranch', 'recentSales', 'lowStockProducts', 'pendingSales', 'dailySales', 'userName'])
        ->and($props['metrics']['total_revenue_today'])->toBe(12000.0)
        ->and($props['dailySales'])->toHaveCount(7);
});
