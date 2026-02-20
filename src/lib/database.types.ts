export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            ai_knowledge: {
                Row: {
                    id: string
                    topic: string
                    content: string
                    category: string
                    is_active: boolean
                    priority: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    topic: string
                    content: string
                    category?: string
                    is_active?: boolean
                    priority?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    topic?: string
                    content?: string
                    category?: string
                    is_active?: boolean
                    priority?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            chat_messages: {
                Row: {
                    id: string
                    session_id: string
                    role: 'user' | 'assistant'
                    content: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    role: 'user' | 'assistant'
                    content: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    role?: 'user' | 'assistant'
                    content?: string
                    created_at?: string
                }
            }
            clients: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    phone: string | null
                    company: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                    discount_koef: number | null
                    City: string | null
                    person_type: string | null
                    delivery_method: string | null
                    address: string | null
                    company_code: string | null
                    vat_payer: boolean | null
                    vat_code: string | null
                    city: string | null
                    post_code: string | null
                    parcel_locker: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    email?: string | null
                    phone?: string | null
                    company?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    discount_koef?: number | null
                    City?: string | null
                    person_type?: string | null
                    delivery_method?: string | null
                    address?: string | null
                    company_code?: string | null
                    vat_payer?: boolean | null
                    vat_code?: string | null
                    city?: string | null
                    post_code?: string | null
                    parcel_locker?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string | null
                    phone?: string | null
                    company?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    discount_koef?: number | null
                    City?: string | null
                    person_type?: string | null
                    delivery_method?: string | null
                    address?: string | null
                    company_code?: string | null
                    vat_payer?: boolean | null
                    vat_code?: string | null
                    city?: string | null
                    post_code?: string | null
                    parcel_locker?: string | null
                }
            }
            orders: {
                Row: {
                    id: string
                    client_id: string
                    order_number: string
                    status: string
                    total_price: number | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                    invoiced: boolean
                    shipped: boolean
                    shipment_number: string | null
                    finish_date: string
                    workflow_link: string | null
                }
                Insert: {
                    id?: string
                    client_id: string
                    order_number: string
                    status?: string
                    total_price?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    invoiced?: boolean
                    shipped?: boolean
                    shipment_number?: string | null
                    finish_date?: string
                    workflow_link?: string | null
                }
                Update: {
                    id?: string
                    client_id?: string
                    order_number?: string
                    status?: string
                    total_price?: number | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                    invoiced?: boolean
                    shipped?: boolean
                    shipment_number?: string | null
                    finish_date?: string
                    workflow_link?: string | null
                }
            }
            materials: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    unit_price: number | null
                    category: string | null
                    current_stock: number | null
                    unit: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    unit_price?: number | null
                    category?: string | null
                    current_stock?: number | null
                    unit?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    unit_price?: number | null
                    category?: string | null
                    current_stock?: number | null
                    unit?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            products: {
                Row: {
                    id: string
                    name: string
                    category: string | null
                    description: string | null
                    base_price: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string | null
                    description?: string | null
                    base_price?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string | null
                    description?: string | null
                    base_price?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            calculation_rules: {
                Row: {
                    id: string
                    rule_type: string // 'Base Price per 100', 'Extra Cost per 100', 'Extra Cost Flat', 'Qty Discount', 'Client Discount'
                    name: string | null
                    description: string | null
                    priority: number
                    is_active: boolean
                    value: number // The price, cost, or discount percentage
                    product_id: string | null
                    lamination: string | null
                    extra_name: string | null // Label for extras: 'Matt Lamination', 'Foil', 'Rounded Corners'
                    min_quantity: number | null
                    max_quantity: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    rule_type: string
                    name?: string | null
                    description?: string | null
                    priority?: number
                    is_active?: boolean
                    value: number
                    product_id?: string | null
                    lamination?: string | null
                    extra_name?: string | null
                    min_quantity?: number | null
                    max_quantity?: number | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    rule_type?: string
                    name?: string | null
                    description?: string | null
                    priority?: number
                    is_active?: boolean
                    value?: number
                    product_id?: string | null
                    lamination?: string | null
                    extra_name?: string | null
                    min_quantity?: number | null
                    max_quantity?: number | null
                    created_at?: string
                    updated_at?: string
                }
            }
            venipak_pickup_points: {
                Row: {
                    id: number
                    pastomat_id: string | null
                    name: string | null
                    pastomat_city: string | null
                    pastomat_address: string | null
                    pastomat_name: string | null
                    pastomat_zip: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    pastomat_id?: string | null
                    name?: string | null
                    pastomat_city?: string | null
                    pastomat_address?: string | null
                    pastomat_name?: string | null
                    pastomat_zip?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    pastomat_id?: string | null
                    name?: string | null
                    pastomat_city?: string | null
                    pastomat_address?: string | null
                    pastomat_name?: string | null
                    pastomat_zip?: string | null
                    created_at?: string
                }
            }
            venipak_label_sequences: {
                Row: {
                    id: number
                    label_date: string
                    sequence_number: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    label_date: string
                    sequence_number: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    label_date?: string
                    sequence_number?: number
                    created_at?: string
                }
            }
            venipak_global_sequence: {
                Row: {
                    id: number
                    current_sequence: number
                    updated_at: string
                }
                Insert: {
                    id?: number
                    current_sequence: number
                    updated_at?: string
                }
                Update: {
                    id?: number
                    current_sequence?: number
                    updated_at?: string
                }
            }
            SASKAITA123Data: {
                Row: {
                    id: number
                    productid: string | null
                    bankid: string | null
                    vatid: string | null
                    seriesid: string | null
                    unitid: string | null
                    created_at: string
                    apiKey: string | null
                    webhookUrl: string | null
                }
                Insert: {
                    id?: number
                    productid?: string | null
                    bankid?: string | null
                    vatid?: string | null
                    seriesid?: string | null
                    unitid?: string | null
                    created_at?: string
                    apiKey?: string | null
                    webhookUrl?: string | null
                }
                Update: {
                    id?: number
                    productid?: string | null
                    bankid?: string | null
                    vatid?: string | null
                    seriesid?: string | null
                    unitid?: string | null
                    created_at?: string
                    apiKey?: string | null
                    webhookUrl?: string | null
                }
            }
            print_options: {
                Row: {
                    id: number
                    print_option: string
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    print_option: string
                    price: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    print_option?: string
                    price?: number
                    created_at?: string
                }
            }
            works: {
                Row: {
                    id: number
                    operation: string
                    price: number
                    cost_price: number | null
                    unit: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    operation: string
                    price: number
                    cost_price?: number | null
                    unit?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    operation?: string
                    price?: number
                    cost_price?: number | null
                    unit?: string | null
                    created_at?: string
                }
            }
            product_works: {
                Row: {
                    id: string
                    product_id: string
                    work_id: string
                    default_quantity: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id: string
                    work_id: string
                    default_quantity?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string
                    work_id?: string
                    default_quantity?: number
                    created_at?: string
                }
            }
            tasks: {
                Row: {
                    id: string
                    description: string
                    status: string
                    created_by: string | null
                    assigned_to: string | null
                    order_id: string | null
                    due_date: string | null
                    estimated_duration: string | null
                    time_spent: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    description: string
                    status?: string
                    created_by?: string | null
                    assigned_to?: string | null
                    order_id?: string | null
                    due_date?: string | null
                    estimated_duration?: string | null
                    time_spent?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    description?: string
                    status?: string
                    created_by?: string | null
                    assigned_to?: string | null
                    order_id?: string | null
                    due_date?: string | null
                    estimated_duration?: string | null
                    time_spent?: string | null
                    created_at?: string
                    updated_at?: string
                }
            },
            product_pricing_matrices: {
                Row: {
                    id: string
                    product_id: string | null
                    quantity_from: number
                    quantity_to: number | null
                    price: number
                    print_type: string | null
                    lamination: string | null
                    material_id: string | null
                    extra_works: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id?: string | null
                    quantity_from: number
                    quantity_to?: number | null
                    price: number
                    print_type?: string | null
                    lamination?: string | null
                    material_id?: string | null
                    extra_works?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string | null
                    quantity_from?: number
                    quantity_to?: number | null
                    price?: number
                    print_type?: string | null
                    lamination?: string | null
                    material_id?: string | null
                    extra_works?: Json | null
                    created_at?: string
                }
            },
            users: {
                Row: {
                    id: string
                    email: string
                    password: string | null
                    role: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    password?: string | null
                    role?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    password?: string | null
                    role?: string
                    created_at?: string
                    updated_at?: string
                }
            }
        }
    }
}
