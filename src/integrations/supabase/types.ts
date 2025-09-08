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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_stores: {
        Row: {
          activity_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          store_id: string
        }
        Insert: {
          activity_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          store_id: string
        }
        Update: {
          activity_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_stores_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chain_logos: {
        Row: {
          chain: string
          created_at: string
          id: string
          logo_filename: string
          logo_url: string
          updated_at: string
        }
        Insert: {
          chain: string
          created_at?: string
          id?: string
          logo_filename: string
          logo_url: string
          updated_at?: string
        }
        Update: {
          chain?: string
          created_at?: string
          id?: string
          logo_filename?: string
          logo_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      chain_price_tags: {
        Row: {
          chain: string
          created_at: string
          id: string
          name: string
          pdf_url: string | null
          updated_at: string
        }
        Insert: {
          chain: string
          created_at?: string
          id?: string
          name: string
          pdf_url?: string | null
          updated_at?: string
        }
        Update: {
          chain?: string
          created_at?: string
          id?: string
          name?: string
          pdf_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          category: Database["public"]["Enums"]["device_category"]
          color: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          model: string | null
          name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["device_category"]
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["device_category"]
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_reasons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          store_category: string
          subject: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          store_category: string
          subject: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          store_category?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_dates: {
        Row: {
          created_at: string
          id: string
          launch_date: string
          launch_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          launch_date: string
          launch_id: string
        }
        Update: {
          created_at?: string
          id?: string
          launch_date?: string
          launch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_dates_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          launch_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          launch_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          launch_id?: string
        }
        Relationships: []
      }
      launch_stores: {
        Row: {
          created_at: string
          date_communicated: boolean | null
          email_sent_at: string | null
          id: string
          launch_id: string
          mail_cartellini: boolean | null
          notes: string | null
          status: string
          store_id: string
          tactician_id: string | null
          technician_name: string | null
          updated_at: string
          visit_date: string | null
          visit_time: string | null
        }
        Insert: {
          created_at?: string
          date_communicated?: boolean | null
          email_sent_at?: string | null
          id?: string
          launch_id: string
          mail_cartellini?: boolean | null
          notes?: string | null
          status?: string
          store_id: string
          tactician_id?: string | null
          technician_name?: string | null
          updated_at?: string
          visit_date?: string | null
          visit_time?: string | null
        }
        Update: {
          created_at?: string
          date_communicated?: boolean | null
          email_sent_at?: string | null
          id?: string
          launch_id?: string
          mail_cartellini?: boolean | null
          notes?: string | null
          status?: string
          store_id?: string
          tactician_id?: string | null
          technician_name?: string | null
          updated_at?: string
          visit_date?: string | null
          visit_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_stores_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_stores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_stores_tactician_id_fkey"
            columns: ["tactician_id"]
            isOneToOne: false
            referencedRelation: "tacticians"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_tables: {
        Row: {
          created_at: string
          id: string
          launch_id: string
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          launch_id: string
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          launch_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_tables_launch_id_fkey"
            columns: ["launch_id"]
            isOneToOne: false
            referencedRelation: "launches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      launches: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          launch_date: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          launch_date?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          launch_date?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_store_visits: {
        Row: {
          created_at: string
          id: string
          imported_by: string | null
          store_id: string
          updated_at: string
          visit_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          imported_by?: string | null
          store_id: string
          updated_at?: string
          visit_type: string
        }
        Update: {
          created_at?: string
          id?: string
          imported_by?: string | null
          store_id?: string
          updated_at?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_store_visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      price_tag_device_associations: {
        Row: {
          created_at: string
          device_id: string
          device_name: string
          id: string
          price_tag_name: string
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name: string
          id?: string
          price_tag_name: string
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string
          id?: string
          price_tag_name?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          issue_type: string
          resolved_at: string | null
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          issue_type: string
          resolved_at?: string | null
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          issue_type?: string
          resolved_at?: string | null
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_issues_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tables: {
        Row: {
          created_at: string
          id: string
          store_id: string
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          category: string
          chain: string
          created_at: string
          director_email: string | null
          email_informatics: string[] | null
          email_technical: string[] | null
          has_digital_price_tags: boolean | null
          has_promotional_banners: string | null
          id: string
          location: string
          name: string
          phone_informatics: string | null
          phone_technical: string | null
          tables_count: number
          updated_at: string
        }
        Insert: {
          category: string
          chain: string
          created_at?: string
          director_email?: string | null
          email_informatics?: string[] | null
          email_technical?: string[] | null
          has_digital_price_tags?: boolean | null
          has_promotional_banners?: string | null
          id?: string
          location: string
          name: string
          phone_informatics?: string | null
          phone_technical?: string | null
          tables_count?: number
          updated_at?: string
        }
        Update: {
          category?: string
          chain?: string
          created_at?: string
          director_email?: string | null
          email_informatics?: string[] | null
          email_technical?: string[] | null
          has_digital_price_tags?: boolean | null
          has_promotional_banners?: string | null
          id?: string
          location?: string
          name?: string
          phone_informatics?: string | null
          phone_technical?: string | null
          tables_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      tables: {
        Row: {
          created_at: string
          devices: Json | null
          id: string
          image_scale: number
          image_url: string | null
          name: string
          price_tags: Json | null
          slots: Json | null
          table_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          devices?: Json | null
          id?: string
          image_scale?: number
          image_url?: string | null
          name: string
          price_tags?: Json | null
          slots?: Json | null
          table_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          devices?: Json | null
          id?: string
          image_scale?: number
          image_url?: string | null
          name?: string
          price_tags?: Json | null
          slots?: Json | null
          table_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tacticians: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          phone_number: string | null
          role: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone_number?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          status: string
          store_id: string
          tactician_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          status?: string
          store_id: string
          tactician_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          store_id?: string
          tactician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_tactician_id_fkey"
            columns: ["tactician_id"]
            isOneToOne: false
            referencedRelation: "tacticians"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string
          store_id: string
          updated_at: string
          visit_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string
          store_id: string
          updated_at?: string
          visit_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string
          store_id?: string
          updated_at?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_tactician: {
        Args: { name: string }
        Returns: {
          created_at: string
          id: string
          name: string
        }[]
      }
      delete_tactician: {
        Args: { tactician_id: string }
        Returns: undefined
      }
      get_stores_public: {
        Args: Record<PropertyKey, never>
        Returns: {
          chain: string
          created_at: string
          has_digital_price_tags: boolean
          id: string
          location: string
          name: string
          tables_count: number
          updated_at: string
        }[]
      }
      get_tacticians: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          name: string
        }[]
      }
      get_user_last_sign_in: {
        Args: { user_uuid: string }
        Returns: string
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
    }
    Enums: {
      device_category: "Accessori" | "iPhone" | "Watch" | "Mac" | "iPad"
      user_role: "admin" | "user"
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
      device_category: ["Accessori", "iPhone", "Watch", "Mac", "iPad"],
      user_role: ["admin", "user"],
    },
  },
} as const
