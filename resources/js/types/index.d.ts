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
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
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
    net: number;
    total: number;
    amount_paid: number;
    change_amount: number;
    payment_method: string;
    date: string;
    status: string;
    created_at: string;
    updated_at: string;
    branch?: Branch | null;
    client?: Client | null;
    seller?: User | null;
    saleProducts: SaleProduct[]; // La propiedad saleProducts siempre debe ser un array
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
