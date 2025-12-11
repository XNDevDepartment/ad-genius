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
      ai_prompt_history: {
        Row: {
          change_notes: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          prompt_id: string | null
          prompt_template: string
          version: number
        }
        Insert: {
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          prompt_id?: string | null
          prompt_template: string
          version: number
        }
        Update: {
          change_notes?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          prompt_id?: string | null
          prompt_template?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_history_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "ai_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          prompt_key: string
          prompt_name: string
          prompt_template: string
          prompt_type: string
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key: string
          prompt_name: string
          prompt_template: string
          prompt_type: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          prompt_key?: string
          prompt_name?: string
          prompt_template?: string
          prompt_type?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: []
      }
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
      domain_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string
          id: string
          rule_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain: string
          id?: string
          rule_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string
          id?: string
          rule_type?: string
        }
        Relationships: []
      }
      dunning_notifications: {
        Row: {
          id: string
          notification_type: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          metadata: Json | null
          page_url: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          page_url: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          metadata?: Json | null
          page_url?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          prompt: string
          public_showcase: boolean | null
          public_url: string
          settings: Json | null
          source_image_id: string | null
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          prompt: string
          public_showcase?: boolean | null
          public_url: string
          settings?: Json | null
          source_image_id?: string | null
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          prompt?: string
          public_showcase?: boolean | null
          public_url?: string
          settings?: Json | null
          source_image_id?: string | null
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "image_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_source_image_id_fkey"
            columns: ["source_image_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
        ]
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
      image_jobs: {
        Row: {
          completed: number | null
          content_hash: string
          created_at: string
          desiredAudience: string | null
          error: string | null
          failed: number | null
          finished_at: string | null
          id: string
          model_type: string | null
          output_url: string | null
          prodSpecs: string | null
          progress: number | null
          prompt: string
          settings: Json
          source_image_id: string | null
          source_image_ids: Json | null
          started_at: string | null
          status: string
          total: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: number | null
          content_hash: string
          created_at?: string
          desiredAudience?: string | null
          error?: string | null
          failed?: number | null
          finished_at?: string | null
          id?: string
          model_type?: string | null
          output_url?: string | null
          prodSpecs?: string | null
          progress?: number | null
          prompt: string
          settings?: Json
          source_image_id?: string | null
          source_image_ids?: Json | null
          started_at?: string | null
          status?: string
          total?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: number | null
          content_hash?: string
          created_at?: string
          desiredAudience?: string | null
          error?: string | null
          failed?: number | null
          finished_at?: string | null
          id?: string
          model_type?: string | null
          output_url?: string | null
          prodSpecs?: string | null
          progress?: number | null
          prompt?: string
          settings?: Json
          source_image_id?: string | null
          source_image_ids?: Json | null
          started_at?: string | null
          status?: string
          total?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kling_jobs: {
        Row: {
          created_at: string
          duration: number
          error: Json | null
          finished_at: string | null
          id: string
          image_path: string | null
          image_url: string | null
          metadata: Json | null
          model: string
          prompt: string
          request_id: string | null
          response_url: string | null
          retry_count: number | null
          source_image_id: string | null
          status: string
          status_url: string | null
          ugc_image_id: string | null
          updated_at: string
          user_id: string
          video_duration: number | null
          video_path: string | null
          video_size_bytes: number | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number
          error?: Json | null
          finished_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          metadata?: Json | null
          model?: string
          prompt: string
          request_id?: string | null
          response_url?: string | null
          retry_count?: number | null
          source_image_id?: string | null
          status?: string
          status_url?: string | null
          ugc_image_id?: string | null
          updated_at?: string
          user_id: string
          video_duration?: number | null
          video_path?: string | null
          video_size_bytes?: number | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number
          error?: Json | null
          finished_at?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          metadata?: Json | null
          model?: string
          prompt?: string
          request_id?: string | null
          response_url?: string | null
          retry_count?: number | null
          source_image_id?: string | null
          status?: string
          status_url?: string | null
          ugc_image_id?: string | null
          updated_at?: string
          user_id?: string
          video_duration?: number | null
          video_path?: string | null
          video_size_bytes?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kling_jobs_source_image_id_fkey"
            columns: ["source_image_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kling_jobs_ugc_image_id_fkey"
            columns: ["ugc_image_id"]
            isOneToOne: false
            referencedRelation: "ugc_images"
            referencedColumns: ["id"]
          },
        ]
      }
      mailerlite_sync_log: {
        Row: {
          action: string
          error_message: string | null
          id: string
          mailerlite_subscriber_id: string | null
          success: boolean
          synced_at: string
          user_id: string
        }
        Insert: {
          action: string
          error_message?: string | null
          id?: string
          mailerlite_subscriber_id?: string | null
          success: boolean
          synced_at?: string
          user_id: string
        }
        Update: {
          action?: string
          error_message?: string | null
          id?: string
          mailerlite_subscriber_id?: string | null
          success?: boolean
          synced_at?: string
          user_id?: string
        }
        Relationships: []
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
      outfit_swap_base_models: {
        Row: {
          age_range: string | null
          body_type: string | null
          created_at: string | null
          display_order: number | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          metadata: Json | null
          name: string
          pose_type: string | null
          public_url: string
          skin_tone: string | null
          storage_path: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          body_type?: string | null
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          pose_type?: string | null
          public_url: string
          skin_tone?: string | null
          storage_path: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          body_type?: string | null
          created_at?: string | null
          display_order?: number | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          pose_type?: string | null
          public_url?: string
          skin_tone?: string | null
          storage_path?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      outfit_swap_batches: {
        Row: {
          base_model_id: string
          completed_jobs: number | null
          created_at: string | null
          failed_jobs: number | null
          finished_at: string | null
          id: string
          metadata: Json | null
          started_at: string | null
          status: string | null
          total_jobs: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_model_id: string
          completed_jobs?: number | null
          created_at?: string | null
          failed_jobs?: number | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          total_jobs?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_model_id?: string
          completed_jobs?: number | null
          created_at?: string | null
          failed_jobs?: number | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          total_jobs?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_swap_batches_base_model_id_fkey"
            columns: ["base_model_id"]
            isOneToOne: false
            referencedRelation: "outfit_swap_base_models"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_swap_ecommerce_photos: {
        Row: {
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          metadata: Json | null
          progress: number | null
          prompt_used: string | null
          public_url: string | null
          result_id: string
          started_at: string | null
          status: string
          storage_path: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          prompt_used?: string | null
          public_url?: string | null
          result_id: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          prompt_used?: string | null
          public_url?: string | null
          result_id?: string
          started_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_swap_ecommerce_photos_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "outfit_swap_results"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_swap_jobs: {
        Row: {
          base_model_id: string | null
          batch_id: string | null
          completed_garments: number | null
          created_at: string | null
          error: string | null
          finished_at: string | null
          garment_ids: Json | null
          id: string
          metadata: Json | null
          progress: number | null
          settings: Json | null
          source_garment_id: string | null
          source_person_id: string | null
          started_at: string | null
          status: string
          total_garments: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          base_model_id?: string | null
          batch_id?: string | null
          completed_garments?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          garment_ids?: Json | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          settings?: Json | null
          source_garment_id?: string | null
          source_person_id?: string | null
          started_at?: string | null
          status?: string
          total_garments?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          base_model_id?: string | null
          batch_id?: string | null
          completed_garments?: number | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          garment_ids?: Json | null
          id?: string
          metadata?: Json | null
          progress?: number | null
          settings?: Json | null
          source_garment_id?: string | null
          source_person_id?: string | null
          started_at?: string | null
          status?: string
          total_garments?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_swap_jobs_base_model_id_fkey"
            columns: ["base_model_id"]
            isOneToOne: false
            referencedRelation: "outfit_swap_base_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_swap_jobs_source_garment_id_fkey"
            columns: ["source_garment_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_swap_jobs_source_person_id_fkey"
            columns: ["source_person_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_swap_photoshoots: {
        Row: {
          back_image_path: string | null
          back_image_url: string | null
          created_at: string | null
          error: string | null
          finished_at: string | null
          id: string
          image_1_path: string | null
          image_1_url: string | null
          image_2_path: string | null
          image_2_url: string | null
          image_3_path: string | null
          image_3_url: string | null
          image_4_path: string | null
          image_4_url: string | null
          metadata: Json | null
          progress: number | null
          result_id: string
          selected_angles: string[] | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_image_path?: string | null
          back_image_url?: string | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          image_1_path?: string | null
          image_1_url?: string | null
          image_2_path?: string | null
          image_2_url?: string | null
          image_3_path?: string | null
          image_3_url?: string | null
          image_4_path?: string | null
          image_4_url?: string | null
          metadata?: Json | null
          progress?: number | null
          result_id: string
          selected_angles?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_image_path?: string | null
          back_image_url?: string | null
          created_at?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          image_1_path?: string | null
          image_1_url?: string | null
          image_2_path?: string | null
          image_2_url?: string | null
          image_3_path?: string | null
          image_3_url?: string | null
          image_4_path?: string | null
          image_4_url?: string | null
          metadata?: Json | null
          progress?: number | null
          result_id?: string
          selected_angles?: string[] | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_swap_photoshoots_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "outfit_swap_results"
            referencedColumns: ["id"]
          },
        ]
      }
      outfit_swap_results: {
        Row: {
          created_at: string | null
          generated_image_id: string | null
          id: string
          job_id: string
          jpg_url: string | null
          metadata: Json | null
          png_url: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          generated_image_id?: string | null
          id?: string
          job_id: string
          jpg_url?: string | null
          metadata?: Json | null
          png_url?: string | null
          public_url: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          generated_image_id?: string | null
          id?: string
          job_id?: string
          jpg_url?: string | null
          metadata?: Json | null
          png_url?: string | null
          public_url?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_swap_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "outfit_swap_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          otp_id: string | null
          phone_number: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_id?: string | null
          phone_number: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_id?: string | null
          phone_number?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string
          analytics_enabled: boolean | null
          created_at: string | null
          description: string | null
          email: string
          id: string
          login_notifications_enabled: boolean | null
          mailerlite_subscriber_id: string | null
          name: string | null
          newsletter_subscribed: boolean | null
          phone_number: string | null
          phone_verified: boolean | null
          profession: string | null
          profile_picture: string | null
          public_gallery_enabled: boolean | null
          show_generation_history: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          analytics_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          email: string
          id: string
          login_notifications_enabled?: boolean | null
          mailerlite_subscriber_id?: string | null
          name?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          profession?: string | null
          profile_picture?: string | null
          public_gallery_enabled?: boolean | null
          show_generation_history?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          analytics_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          login_notifications_enabled?: boolean | null
          mailerlite_subscriber_id?: string | null
          name?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          phone_verified?: boolean | null
          profession?: string | null
          profile_picture?: string | null
          public_gallery_enabled?: boolean | null
          show_generation_history?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_redemptions: {
        Row: {
          credits_received: number
          id: string
          promo_code_id: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          credits_received: number
          id?: string
          promo_code_id: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          credits_received?: number
          id?: string
          promo_code_id?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          credits_amount: number
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          credits_amount?: number
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          credits_amount?: number
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      source_images: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          public_url: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          public_url: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          public_url?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
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
          payment_failed_at: string | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_status: string | null
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
          payment_failed_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
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
          payment_failed_at?: string | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers_audit_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
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
      ugc_images: {
        Row: {
          created_at: string
          id: string
          job_id: string
          meta: Json | null
          prompt: string | null
          public_showcase: boolean | null
          public_url: string
          source_image_id: string | null
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          meta?: Json | null
          prompt?: string | null
          public_showcase?: boolean | null
          public_url: string
          source_image_id?: string | null
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          meta?: Json | null
          prompt?: string | null
          public_showcase?: boolean | null
          public_url?: string
          source_image_id?: string | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "image_jobs"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_image_cost: { Args: { p_settings: Json }; Returns: number }
      can_afford_video: {
        Args: { p_duration?: number; p_user_id: string }
        Returns: boolean
      }
      check_recent_credit_allocation: {
        Args: {
          p_hours_threshold?: number
          p_reason: string
          p_user_id: string
        }
        Returns: boolean
      }
      cleanup_old_gemini_conversations: {
        Args: { p_days_old?: number }
        Returns: number
      }
      cleanup_orphaned_base_models: {
        Args: never
        Returns: {
          action: string
          model_id: string
          model_name: string
          storage_path: string
        }[]
      }
      deduct_user_credits: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      generate_idempotency_key: {
        Args: {
          p_prompt: string
          p_settings: Json
          p_source_image_id: string
          p_user_id: string
        }
        Returns: string
      }
      get_gemini_conversation_message_count: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      get_gemini_conversations_with_latest_message: {
        Args: { p_user_id: string }
        Returns: {
          audience: string
          conversation_created_at: string
          conversation_id: string
          conversation_updated_at: string
          image_analysis: string
          image_url: string
          latest_message_content: string
          latest_message_created_at: string
          latest_message_role: string
          niche: string
        }[]
      }
      get_image_credit_cost: {
        Args: { p_count?: number; p_quality?: string }
        Returns: number
      }
      get_public_showcase_images: {
        Args: never
        Returns: {
          created_at: string
          id: string
          prompt: string
          public_url: string
          settings: Json
          storage_path: string
          updated_at: string
        }[]
      }
      get_tier_monthly_credits: { Args: { p_tier: string }; Returns: number }
      get_user_library_images: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          created_at: string
          id: string
          image_type: string
          meta: Json
          prompt: string
          public_url: string
          settings: Json
          source_image_id: string
        }[]
      }
      get_video_credit_cost: {
        Args: { p_duration?: number; p_quality?: string }
        Returns: number
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_user_admin: { Args: { check_user_id?: string }; Returns: boolean }
      refund_user_credits: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      reset_monthly_credits: {
        Args: never
        Returns: {
          credits_added: number
          new_balance: number
          old_balance: number
          user_id: string
        }[]
      }
      reset_user_monthly_credits: { Args: { p_user_id: string }; Returns: Json }
      search_gemini_conversations: {
        Args: { p_limit?: number; p_search_term: string; p_user_id: string }
        Returns: {
          audience: string
          conversation_id: string
          created_at: string
          image_analysis: string
          niche: string
          relevance_score: number
          updated_at: string
        }[]
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
