export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      booking_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status: string
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_number: string
          business_id: string
          created_at: string
          customer_id: string | null
          deposit_paid: number | null
          employee_id: string | null
          end_time: string
          id: string
          notes: string | null
          payment_link: string | null
          payment_status: string | null
          price: number
          receipt_sent: boolean | null
          reminder_sent: boolean | null
          service_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_date: string
          booking_number: string
          business_id: string
          created_at?: string
          customer_id?: string | null
          deposit_paid?: number | null
          employee_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          payment_link?: string | null
          payment_status?: string | null
          price: number
          receipt_sent?: boolean | null
          reminder_sent?: boolean | null
          service_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_date?: string
          booking_number?: string
          business_id?: string
          created_at?: string
          customer_id?: string | null
          deposit_paid?: number | null
          employee_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          payment_link?: string | null
          payment_status?: string | null
          price?: number
          receipt_sent?: boolean | null
          reminder_sent?: boolean | null
          service_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      business_units: {
        Row: {
          address: string | null
          color: string | null
          created_at: string
          flutterwave_public_key: string | null
          flutterwave_secret_key: string | null
          icon: string | null
          id: string
          name: string
          paystack_public_key: string | null
          paystack_secret_key: string | null
          phone: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          color?: string | null
          created_at?: string
          flutterwave_public_key?: string | null
          flutterwave_secret_key?: string | null
          icon?: string | null
          id?: string
          name: string
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          color?: string | null
          created_at?: string
          flutterwave_public_key?: string | null
          flutterwave_secret_key?: string | null
          icon?: string | null
          id?: string
          name?: string
          paystack_public_key?: string | null
          paystack_secret_key?: string | null
          phone?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_penalties: {
        Row: {
          applied_by: string | null
          applied_date: string
          contract_id: string
          created_at: string
          description: string
          employee_id: string
          id: string
          penalty_amount: number
          violation_type: string
        }
        Insert: {
          applied_by?: string | null
          applied_date?: string
          contract_id: string
          created_at?: string
          description: string
          employee_id: string
          id?: string
          penalty_amount?: number
          violation_type: string
        }
        Update: {
          applied_by?: string | null
          applied_date?: string
          contract_id?: string
          created_at?: string
          description?: string
          employee_id?: string
          id?: string
          penalty_amount?: number
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_penalties_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_penalties_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          business_id: string
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tag_assignments: {
        Row: {
          created_at: string
          customer_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          business_id: string
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          business_id: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          last_visit: string | null
          loyalty_points: number | null
          name: string | null
          notes: string | null
          phone: string | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          last_visit?: string | null
          loyalty_points?: number | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          employee_id: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          employee_id: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          employee_id?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_activity_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contracts: {
        Row: {
          business_id: string
          contract_data: Json
          created_at: string
          employee_id: string
          employee_signature: string | null
          employee_signed_at: string | null
          end_date: string | null
          id: string
          management_signature: string | null
          management_signed_at: string | null
          pdf_url: string | null
          signed_by: string | null
          start_date: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          contract_data?: Json
          created_at?: string
          employee_id: string
          employee_signature?: string | null
          employee_signed_at?: string | null
          end_date?: string | null
          id?: string
          management_signature?: string | null
          management_signed_at?: string | null
          pdf_url?: string | null
          signed_by?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          contract_data?: Json
          created_at?: string
          employee_id?: string
          employee_signature?: string | null
          employee_signed_at?: string | null
          end_date?: string | null
          id?: string
          management_signature?: string | null
          management_signed_at?: string | null
          pdf_url?: string | null
          signed_by?: string | null
          start_date?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          business_id: string
          commission_percentage: number
          commission_type: string
          created_at: string
          email: string | null
          fixed_commission: number | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          email?: string | null
          fixed_commission?: number | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          email?: string | null
          fixed_commission?: number | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          receipt_url: string | null
          vendor: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          business_id: string
          created_at: string
          id: string
          last_restocked_at: string | null
          quantity_on_hand: number
          quantity_reserved: number
          reorder_level: number | null
          reorder_quantity: number | null
          service_id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          service_id: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          last_restocked_at?: string | null
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          business_id: string
          created_at: string
          customer_id: string | null
          discount_amount: number
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          business_id: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          business_id?: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          business_id: string
          created_at: string
          email_enabled: boolean | null
          id: string
          sms_api_key: string | null
          sms_enabled: boolean | null
          sms_provider: string | null
          updated_at: string
          whatsapp_enabled: boolean | null
          whatsapp_token: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_token?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          sms_api_key?: string | null
          sms_enabled?: boolean | null
          sms_provider?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string
          channel: string
          created_at: string
          id: string
          message: string
          recipient_id: string | null
          recipient_type: string
          sent_at: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          business_id: string
          channel: string
          created_at?: string
          id?: string
          message: string
          recipient_id?: string | null
          recipient_type: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type: string
        }
        Update: {
          business_id?: string
          channel?: string
          created_at?: string
          id?: string
          message?: string
          recipient_id?: string | null
          recipient_type?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          business_id: string
          created_at: string
          id: string
          payment_instructions: string | null
          paystack_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          business_id: string
          created_at?: string
          id?: string
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          business_id?: string
          created_at?: string
          id?: string
          payment_instructions?: string | null
          paystack_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          business_id: string
          callback_url: string | null
          created_at: string
          customer_email: string | null
          gateway: string
          gateway_response: Json | null
          id: string
          metadata: Json | null
          reference: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          callback_url?: string | null
          created_at?: string
          customer_email?: string | null
          gateway: string
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          callback_url?: string | null
          created_at?: string
          customer_email?: string | null
          gateway?: string
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          reference: string | null
          sale_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          reference?: string | null
          sale_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          reference?: string | null
          sale_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          service_id: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          id?: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          service_id?: string | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          service_id?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          business_id: string
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          received_date: string | null
          status: string
          supplier_id: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          received_date?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          received_date?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount: number | null
          id: string
          quantity: number
          sale_id: string
          service_id: string | null
          tax_amount: number | null
          total: number
          unit_price: number
        }
        Insert: {
          discount?: number | null
          id?: string
          quantity?: number
          sale_id: string
          service_id?: string | null
          tax_amount?: number | null
          total: number
          unit_price: number
        }
        Update: {
          discount?: number | null
          id?: string
          quantity?: number
          sale_id?: string
          service_id?: string | null
          tax_amount?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          balance_due: number
          business_id: string
          created_at: string
          customer_id: string | null
          discount_amount: number
          employee_id: string | null
          id: string
          notes: string | null
          payment_method: string
          payment_status: string
          sale_number: string
          subtotal: number
          tax_amount: number
          total_amount: number
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          business_id: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          sale_number: string
          subtotal?: number
          tax_amount?: number
          total_amount: number
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          business_id?: string
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          employee_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          sale_number?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          barcode: string | null
          base_price: number
          buffer_time: number | null
          business_id: string
          category: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          service_type: string | null
          sku: string | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          base_price?: number
          buffer_time?: number | null
          business_id: string
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          service_type?: string | null
          sku?: string | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          base_price?: number
          buffer_time?: number | null
          business_id?: string
          category?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          service_type?: string | null
          sku?: string | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          business_id: string
          created_at: string
          day_of_week: number
          employee_id: string
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          day_of_week: number
          employee_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          day_of_week?: number
          employee_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          quantity: number
          reference_id: string | null
          service_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          service_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          business_id: string
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          business_id: string
          commission_amount: number
          created_at: string
          employee_id: string | null
          house_amount: number
          id: string
          is_commission_paid: boolean
          notes: string | null
          paid_at: string | null
          service_id: string | null
          total_amount: number
        }
        Insert: {
          business_id: string
          commission_amount: number
          created_at?: string
          employee_id?: string | null
          house_amount: number
          id?: string
          is_commission_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          service_id?: string | null
          total_amount: number
        }
        Update: {
          business_id?: string
          commission_amount?: number
          created_at?: string
          employee_id?: string | null
          house_amount?: number
          id?: string
          is_commission_paid?: boolean
          notes?: string | null
          paid_at?: string | null
          service_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_conflict: {
        Args: {
          p_booking_date: string
          p_employee_id: string
          p_end_time: string
          p_exclude_booking_id?: string
          p_start_time: string
        }
        Returns: boolean
      }
      generate_booking_number: {
        Args: { p_business_id: string }
        Returns: string
      }
      generate_invoice_number: {
        Args: { p_business_id: string }
        Returns: string
      }
      generate_po_number: { Args: { p_business_id: string }; Returns: string }
      generate_sale_number: { Args: { p_business_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      notify_low_stock: { Args: never; Returns: undefined }
      schedule_booking_reminder: {
        Args: { p_booking_id: string; p_hours_before?: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
