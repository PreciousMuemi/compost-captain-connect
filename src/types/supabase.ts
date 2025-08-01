export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      collections: {
        Row: {
          collection_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          quantity: number | null
          status: string | null
          updated_at: string | null
          waste_report_id: string
        }
        Insert: {
          collection_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
          waste_report_id: string
        }
        Update: {
          collection_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number | null
          status?: string | null
          updated_at?: string | null
          waste_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_waste_report_id_fkey"
            columns: ["waste_report_id"]
            isOneToOne: false
            referencedRelation: "waste_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          discount_percentage: number | null
          id: string
          is_farmer: boolean | null
          location: string | null
          name: string
          phone_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_farmer?: boolean | null
          location?: string | null
          name: string
          phone_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_farmer?: boolean | null
          location?: string | null
          name?: string
          phone_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          id: string
          last_updated: string | null
          pellets_ready_kg: number | null
          processed_manure_kg: number | null
          raw_waste_kg: number | null
        }
        Insert: {
          id?: string
          last_updated?: string | null
          pellets_ready_kg?: number | null
          processed_manure_kg?: number | null
          raw_waste_kg?: number | null
        }
        Update: {
          id?: string
          last_updated?: string | null
          pellets_ready_kg?: number | null
          processed_manure_kg?: number | null
          raw_waste_kg?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          recipient_id: string
          related_entity_id: string | null
          sender_id: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          recipient_id: string
          related_entity_id?: string | null
          sender_id?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_id?: string
          related_entity_id?: string | null
          sender_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string | null
          price: number
          product_id: number | null
          quantity: number
        }
        Insert: {
          id?: string
          order_id?: string | null
          price: number
          product_id?: number | null
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number
          product_id?: number | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_rider: string | null
          created_at: string | null
          customer_id: string
          delivered_at: string | null
          delivery_date: string | null
          dispatch_started_at: string | null
          farmer_id: string | null
          id: string
          price_per_kg: number
          quantity_kg: number
          rider_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          assigned_rider?: string | null
          created_at?: string | null
          customer_id: string
          delivered_at?: string | null
          delivery_date?: string | null
          dispatch_started_at?: string | null
          farmer_id?: string | null
          id?: string
          price_per_kg: number
          quantity_kg: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          assigned_rider?: string | null
          created_at?: string | null
          customer_id?: string
          delivered_at?: string | null
          delivery_date?: string | null
          dispatch_started_at?: string | null
          farmer_id?: string | null
          id?: string
          price_per_kg?: number
          quantity_kg?: number
          rider_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_rider_fkey"
            columns: ["assigned_rider"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string | null
          farmer_id: string | null
          id: string
          mpesa_transaction_id: string | null
          order_id: string | null
          payment_type: string
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id?: string | null
          farmer_id?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          order_id?: string | null
          payment_type: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string | null
          farmer_id?: string | null
          id?: string
          mpesa_transaction_id?: string | null
          order_id?: string | null
          payment_type?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          description: string | null
          id: number
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          description?: string | null
          id?: number
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          location: string | null
          orders_count: number | null
          phone_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
          waste_reports_count: number | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          location?: string | null
          orders_count?: number | null
          phone_number: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
          waste_reports_count?: number | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          location?: string | null
          orders_count?: number | null
          phone_number?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
          waste_reports_count?: number | null
        }
        Relationships: []
      }
      riders: {
        Row: {
          created_at: string
          current_orders: number | null
          id: string
          last_location: string | null
          name: string
          phone_number: string
          status: string | null
          success_rate: number | null
          total_deliveries: number | null
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          current_orders?: number | null
          id?: string
          last_location?: string | null
          name: string
          phone_number: string
          status?: string | null
          success_rate?: number | null
          total_deliveries?: number | null
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          current_orders?: number | null
          id?: string
          last_location?: string | null
          name?: string
          phone_number?: string
          status?: string | null
          success_rate?: number | null
          total_deliveries?: number | null
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_reports: {
        Row: {
          admin_verified: boolean | null
          assigned_driver_id: string | null
          collected_date: string | null
          created_at: string | null
          farmer_id: string
          id: string
          location: string | null
          notes: string | null
          pickup_completed_at: string | null
          pickup_started_at: string | null
          quantity_kg: number
          rider_id: string | null
          scheduled_pickup_date: string | null
          status: Database["public"]["Enums"]["waste_status"] | null
          updated_at: string | null
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Insert: {
          admin_verified?: boolean | null
          assigned_driver_id?: string | null
          collected_date?: string | null
          created_at?: string | null
          farmer_id: string
          id?: string
          location?: string | null
          notes?: string | null
          pickup_completed_at?: string | null
          pickup_started_at?: string | null
          quantity_kg: number
          rider_id?: string | null
          scheduled_pickup_date?: string | null
          status?: Database["public"]["Enums"]["waste_status"] | null
          updated_at?: string | null
          waste_type: Database["public"]["Enums"]["waste_type"]
        }
        Update: {
          admin_verified?: boolean | null
          assigned_driver_id?: string | null
          collected_date?: string | null
          created_at?: string | null
          farmer_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          pickup_completed_at?: string | null
          pickup_started_at?: string | null
          quantity_kg?: number
          rider_id?: string | null
          scheduled_pickup_date?: string | null
          status?: Database["public"]["Enums"]["waste_status"] | null
          updated_at?: string | null
          waste_type?: Database["public"]["Enums"]["waste_type"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_reports_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_reports_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_reports_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ticket_response: {
        Args: {
          ticket_id: string
          user_id: string
          message: string
          is_admin_response: boolean
        }
        Returns: string
      }
      get_ticket_responses: {
        Args: { p_ticket_id: string }
        Returns: {
          id: string
          ticket_id: string
          message: string
          created_at: string
          is_admin_response: boolean
          user_name: string
          user_role: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      order_status: "pending" | "confirmed" | "delivered" | "cancelled"
      payment_status: "pending" | "completed" | "failed"
      user_role: "admin" | "dispatch" | "farmer" | "buyer"
      waste_status: "reported" | "scheduled" | "collected" | "processed"
      waste_type:
        | "animal_manure"
        | "coffee_husks"
        | "rice_hulls"
        | "maize_stalks"
        | "other"
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
      order_status: ["pending", "confirmed", "delivered", "cancelled"],
      payment_status: ["pending", "completed", "failed"],
      user_role: ["admin", "dispatch", "farmer", "buyer"],
      waste_status: ["reported", "scheduled", "collected", "processed"],
      waste_type: [
        "animal_manure",
        "coffee_husks",
        "rice_hulls",
        "maize_stalks",
        "other",
      ],
    },
  },
} as const
