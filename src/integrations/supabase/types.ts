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
      conversation_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_conversation_messages_conversation_id"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assistant_id: string
          created_at: string
          id: string
          status: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          id?: string
          status?: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          id?: string
          status?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credits_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          prompt: string
          public_showcase: boolean | null
          public_url: string
          settings: Json | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt: string
          public_showcase?: boolean | null
          public_url: string
          settings?: Json | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          public_showcase?: boolean | null
          public_url?: string
          settings?: Json | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_images_jobs: {
        Row: {
          created_at: string
          generated_image_id: string
          generation_job_id: string
          id: string
        }
        Insert: {
          created_at?: string
          generated_image_id: string
          generation_job_id: string
          id?: string
        }
        Update: {
          created_at?: string
          generated_image_id?: string
          generation_job_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_jobs_generated_image_id_fkey"
            columns: ["generated_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_jobs_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          generated_images_count: number
          id: string
          progress: number
          prompt: string
          settings: Json
          started_at: string | null
          status: string
          total_images: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_images_count?: number
          id?: string
          progress?: number
          prompt: string
          settings?: Json
          started_at?: string | null
          status?: string
          total_images?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_images_count?: number
          id?: string
          progress?: number
          prompt?: string
          settings?: Json
          started_at?: string | null
          status?: string
          total_images?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      image_favorites: {
        Row: {
          created_at: string | null
          id: string
          image_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_favorites_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_generation_complete: boolean | null
          email_marketing: boolean | null
          email_monthly_summary: boolean | null
          email_new_features: boolean | null
          id: string
          push_credit_alerts: boolean | null
          push_enabled: boolean | null
          push_generation_updates: boolean | null
          sound_effects: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_generation_complete?: boolean | null
          email_marketing?: boolean | null
          email_monthly_summary?: boolean | null
          email_new_features?: boolean | null
          id?: string
          push_credit_alerts?: boolean | null
          push_enabled?: boolean | null
          push_generation_updates?: boolean | null
          sound_effects?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_generation_complete?: boolean | null
          email_marketing?: boolean | null
          email_monthly_summary?: boolean | null
          email_new_features?: boolean | null
          id?: string
          push_credit_alerts?: boolean | null
          push_enabled?: boolean | null
          push_generation_updates?: boolean | null
          sound_effects?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string
          created_at: string | null
          description: string | null
          email: string
          id: string
          name: string | null
          profession: string | null
          profile_picture: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          description?: string | null
          email: string
          id: string
          name?: string | null
          profession?: string | null
          profile_picture?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          name?: string | null
          profession?: string | null
          profile_picture?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          credits_balance: number
          email: string | null
          id: string
          last_reset_at: string | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_balance?: number
          email?: string | null
          id?: string
          last_reset_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_balance?: number
          email?: string | null
          id?: string
          last_reset_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          assistant_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          assistant_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          assistant_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_save_images: boolean | null
          created_at: string
          default_aspect_ratio: string | null
          id: string
          language: string | null
          theme: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_save_images?: boolean | null
          created_at?: string
          default_aspect_ratio?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_save_images?: boolean | null
          created_at?: string
          default_aspect_ratio?: string | null
          id?: string
          language?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
    }
    Enums: {
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
      user_role: ["admin", "user"],
    },
  },
} as const
