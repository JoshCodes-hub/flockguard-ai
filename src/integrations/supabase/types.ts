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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      farms: {
        Row: {
          bird_count: number
          bird_type: string | null
          created_at: string
          farm_name: string
          id: string
          location: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bird_count?: number
          bird_type?: string | null
          created_at?: string
          farm_name: string
          id?: string
          location?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bird_count?: number
          bird_type?: string | null
          created_at?: string
          farm_name?: string
          id?: string
          location?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      poultry_records: {
        Row: {
          activity_level: string | null
          created_at: string
          farm_id: string
          feed_intake: string | null
          humidity: number | null
          id: string
          notes: string | null
          symptoms: string[]
          temperature: number | null
          user_id: string
          water_consumption: string | null
        }
        Insert: {
          activity_level?: string | null
          created_at?: string
          farm_id: string
          feed_intake?: string | null
          humidity?: number | null
          id?: string
          notes?: string | null
          symptoms?: string[]
          temperature?: number | null
          user_id: string
          water_consumption?: string | null
        }
        Update: {
          activity_level?: string | null
          created_at?: string
          farm_id?: string
          feed_intake?: string | null
          humidity?: number | null
          id?: string
          notes?: string | null
          symptoms?: string[]
          temperature?: number | null
          user_id?: string
          water_consumption?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poultry_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          confidence: number
          created_at: string
          factors: Json
          farm_id: string
          id: string
          image_id: string | null
          is_verified: boolean
          prediction: string
          prediction_source: string
          recommendation: string | null
          record_id: string | null
          risk_level: string
          user_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence: number
          created_at?: string
          factors?: Json
          farm_id: string
          id?: string
          image_id?: string | null
          is_verified?: boolean
          prediction: string
          prediction_source: string
          recommendation?: string | null
          record_id?: string | null
          risk_level: string
          user_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          factors?: Json
          farm_id?: string
          id?: string
          image_id?: string | null
          is_verified?: boolean
          prediction?: string
          prediction_source?: string
          recommendation?: string | null
          record_id?: string | null
          risk_level?: string
          user_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "uploaded_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "poultry_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          farm_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_images: {
        Row: {
          confidence: number | null
          created_at: string
          detected_symptoms: string[]
          farm_id: string
          id: string
          image_path: string
          prediction: string | null
          recommendation: string | null
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          detected_symptoms?: string[]
          farm_id: string
          id?: string
          image_path: string
          prediction?: string | null
          recommendation?: string | null
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          detected_symptoms?: string[]
          farm_id?: string
          id?: string
          image_path?: string
          prediction?: string | null
          recommendation?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_images_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "farmer" | "veterinarian" | "admin"
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
      app_role: ["farmer", "veterinarian", "admin"],
    },
  },
} as const
