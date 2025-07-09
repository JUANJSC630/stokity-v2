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
    status?: boolean;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Branch {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string | null;
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
