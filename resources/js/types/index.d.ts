import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    roles?: string[]; // Which roles can access this menu item
    children?: NavItem[]; // Sub-items for nested navigation
    disabled?: boolean; // Show as disabled (no access)
    highlight?: boolean; // Visual emphasis (e.g., POS button)
}

export interface BusinessSetting {
    name: string;
    logo: string | null;
    logo_url: string;
    default_product_image: string | null;
    default_product_image_url: string | null;
    nit: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    currency_symbol: string;
    require_cash_session: boolean;
}

export interface CashSession {
    id: number;
    branch_id: number;
    opened_by_user_id: number;
    closed_by_user_id: number | null;
    status: 'open' | 'closed';
    opening_amount: number;
    opening_notes: string | null;
    opened_at: string;
    closing_amount_declared: number | null;
    closing_notes: string | null;
    closed_at: string | null;
    total_sales_cash: number;
    total_sales_card: number;
    total_sales_transfer: number;
    total_sales_other: number;
    total_cash_in: number;
    total_cash_out: number;
    total_refunds_cash: number;
    expected_cash: number | null;
    discrepancy: number | null;
    opened_by?: { id: number; name: string };
    closed_by?: { id: number; name: string } | null;
    branch?: { id: number; name: string };
}

export interface CashMovement {
    id: number;
    session_id: number;
    user_id: number;
    type: 'cash_in' | 'cash_out';
    amount: number;
    concept: string;
    notes: string | null;
    created_at: string;
    user?: { id: number; name: string };
}

export interface SharedData {
    name: string;
    business: BusinessSetting;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    flash: {
        success?: string | null;
        last_sale_id?: number | null;
        last_sale_code?: string | null;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    branch_id?: number | null;
    branch?: Branch | null;
    status?: boolean;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    last_login_at?: string | null;
    photo?: string | null;
    photo_url?: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Client {
    id: number;
    name: string;
    document?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export interface PaymentMethod {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string | null;
    business_name?: string;
    status: boolean;
    manager_id: number | null;
    manager?: User;
    employees?: User[];
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
    status: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: { url: string | null; label: string; active: boolean }[];
}

export interface Product {
    id: number;
    name: string;
    code: string;
    description: string | null;
    purchase_price: number;
    sale_price: number;
    tax: number;
    stock: number;
    min_stock: number;
    image: string | null;
    image_url: string;
    category_id: number;
    branch_id: number;
    status: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Relations
    category?: Category;
    branch?: Branch;
}

export interface Sale {
    id: number;
    branch_id: number;
    code: string;
    client_id: number;
    seller_id: number;
    tax: number;
    discount_type: 'none' | 'percentage' | 'fixed';
    discount_value: number;
    discount_amount: number;
    net: number;
    total: number;
    amount_paid: number;
    change_amount: number;
    payment_method: string;
    date: string;
    status: string;
    notes?: string | null;
    created_at: string;
    updated_at: string;
    branch?: Branch | null;
    client?: Client | null;
    seller?: User | null;
    saleProducts: SaleProduct[];
    saleReturns?: SaleReturn[];
}

export interface SaleProduct {
    id: number;
    sale_id: number;
    product_id: number;
    quantity: number;
    price: number;
    subtotal: number;
    product?: Product | null; // Producto puede ser opcional o nulo
}

export interface SaleReturn {
    id: number;
    reason: string | null;
    created_at: string;
    products: SaleReturnProduct[];
    total: number;
}
export interface SaleReturnProduct {
    id: number;
    name: string;
    pivot: {
        quantity: number;
    };
    price: number;
}

export interface StockMovement {
    id: number;
    product_id: number;
    user_id: number;
    branch_id: number;
    supplier_id: number | null;
    type: 'in' | 'out' | 'adjustment' | 'purchase' | 'write_off' | 'supplier_return';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_cost: number | null;
    reference: string | null;
    notes: string | null;
    movement_date: string;
    created_at: string;
    updated_at: string;
    // Relations
    product?: Product | null;
    user?: User | null;
    branch?: Branch | null;
    supplier?: Supplier | null;
}

export interface Supplier {
    id: number;
    branch_id: number;
    name: string;
    nit: string | null;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    status: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Relations
    branch?: Branch | null;
    products?: SupplierProduct[];
}

export interface SupplierProduct extends Product {
    pivot: {
        purchase_price: number | null;
        supplier_code: string | null;
        is_default: boolean;
    };
}

export interface SupplierPivot {
    purchase_price: number | null;
    supplier_code: string | null;
    is_default: boolean;
}
