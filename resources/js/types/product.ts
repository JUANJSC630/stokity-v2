import { Branch, Category } from './index.d';

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
