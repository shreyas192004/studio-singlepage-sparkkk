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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type: string
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          phone: string
          postal_code: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          clothing_type: string | null
          color_scheme: string
          created_at: string | null
          id: string
          image_position: string | null
          image_url: string
          included_text: string | null
          prompt: string
          session_id: string
          style: string
          user_id: string | null
        }
        Insert: {
          clothing_type?: string | null
          color_scheme: string
          created_at?: string | null
          id?: string
          image_position?: string | null
          image_url: string
          included_text?: string | null
          prompt: string
          session_id: string
          style: string
          user_id?: string | null
        }
        Update: {
          clothing_type?: string | null
          color_scheme?: string
          created_at?: string | null
          id?: string
          image_position?: string | null
          image_url?: string
          included_text?: string | null
          prompt?: string
          session_id?: string
          style?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          data: Json | null
          designer_id: string | null
          event_type: string
          id: string
          page: string | null
          path: string | null
          product_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          designer_id?: string | null
          event_type: string
          id?: string
          page?: string | null
          path?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          designer_id?: string | null
          event_type?: string
          id?: string
          page?: string | null
          path?: string | null
          product_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "designers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: number
          product_id: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          product_id: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          product_id?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coupon_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          discount_amount: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_amount?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_amount?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      designers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          featured: boolean | null
          id: string
          men_only: boolean | null
          name: string
          social_links: Json | null
          updated_at: string | null
          user_id: string | null
          women_only: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string
          men_only?: boolean | null
          name: string
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          women_only?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          featured?: boolean | null
          id?: string
          men_only?: boolean | null
          name?: string
          social_links?: Json | null
          updated_at?: string | null
          user_id?: string | null
          women_only?: boolean | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          size: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          size?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          total_price?: number
          unit_price?: number
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
          billing_address_id: string | null
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          shipping_address_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_generation_id: number | null
          brand: string | null
          category: string
          clothing_type: string | null
          colors: string[] | null
          compare_at_price: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date_added: string | null
          description: string
          designer_id: string | null
          dimensions: string | null
          filter_requirements: Json | null
          id: string
          image_position: string | null
          images: string[] | null
          images_generated_by_users: number | null
          inventory: Json | null
          is_ai_generated: boolean | null
          material: string | null
          popularity: number | null
          price: number
          sizes: string[] | null
          sku: string
          structured_card_data: Json | null
          sub_category: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string | null
          weight: number | null
        }
        Insert: {
          ai_generation_id?: number | null
          brand?: string | null
          category: string
          clothing_type?: string | null
          colors?: string[] | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_added?: string | null
          description: string
          designer_id?: string | null
          dimensions?: string | null
          filter_requirements?: Json | null
          id?: string
          image_position?: string | null
          images?: string[] | null
          images_generated_by_users?: number | null
          inventory?: Json | null
          is_ai_generated?: boolean | null
          material?: string | null
          popularity?: number | null
          price: number
          sizes?: string[] | null
          sku: string
          structured_card_data?: Json | null
          sub_category?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string | null
          weight?: number | null
        }
        Update: {
          ai_generation_id?: number | null
          brand?: string | null
          category?: string
          clothing_type?: string | null
          colors?: string[] | null
          compare_at_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date_added?: string | null
          description?: string
          designer_id?: string | null
          dimensions?: string | null
          filter_requirements?: Json | null
          id?: string
          image_position?: string | null
          images?: string[] | null
          images_generated_by_users?: number | null
          inventory?: Json | null
          is_ai_generated?: boolean | null
          material?: string | null
          popularity?: number | null
          price?: number
          sizes?: string[] | null
          sku?: string
          structured_card_data?: Json | null
          sub_category?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "designers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_generation_stats: {
        Row: {
          created_at: string
          generation_count: number
          has_purchased: boolean
          id: string
          last_reset_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_count?: number
          has_purchased?: boolean
          id?: string
          last_reset_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation_count?: number
          has_purchased?: boolean
          id?: string
          last_reset_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_order_stats: {
        Row: {
          created_at: string
          first_order_discount_used: boolean
          id: string
          order_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_order_discount_used?: boolean
          id?: string
          order_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_order_discount_used?: boolean
          id?: string
          order_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: number
          metadata: Json | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          metadata?: Json | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          metadata?: Json | null
          product_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "designer"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
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
      app_role: ["admin", "moderator", "user", "designer"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const
