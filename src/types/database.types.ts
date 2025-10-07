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
      abbreviations: {
        Row: {
          abbreviation: string
          created_at: string
          created_by: string
          full_text: string
          id: string
          is_global: boolean
          organization_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abbreviation: string
          created_at?: string
          created_by: string
          full_text: string
          id?: string
          is_global?: boolean
          organization_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abbreviation?: string
          created_at?: string
          created_by?: string
          full_text?: string
          id?: string
          is_global?: boolean
          organization_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      chapter_remarks: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string
          display_order: number
          id: string
          remark_text: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by: string
          display_order: number
          id?: string
          remark_text: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          remark_text?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_remarks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_number: number
          content: string | null
          created_at: string
          created_by: string
          depth: number
          display_order: number
          heading: string
          id: string
          is_mandatory: boolean
          manual_id: string
          page_break: boolean
          regulatory_reference: string[] | null
          parent_id: string | null
          section_number: number | null
          subsection_number: number | null
          clause_number: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chapter_number: number
          content?: string | null
          created_at?: string
          created_by: string
          depth?: number
          display_order: number
          heading: string
          id?: string
          is_mandatory?: boolean
          manual_id: string
          page_break?: boolean
          regulatory_reference?: string[] | null
          parent_id?: string | null
          section_number?: number | null
          subsection_number?: number | null
          clause_number?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chapter_number?: number
          content?: string | null
          created_at?: string
          created_by?: string
          depth?: number
          display_order?: number
          heading?: string
          id?: string
          is_mandatory?: boolean
          manual_id?: string
          page_break?: boolean
          regulatory_reference?: string[] | null
          parent_id?: string | null
          section_number?: number | null
          subsection_number?: number | null
          clause_number?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      content_blocks: {
        Row: {
          block_type: string
          chapter_id: string
          content: Json
          created_at: string
          created_by: string
          display_order: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          block_type?: string
          chapter_id: string
          content: Json
          created_at?: string
          created_by: string
          display_order: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          block_type?: string
          chapter_id?: string
          content?: Json
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_blocks_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      definitions: {
        Row: {
          created_at: string
          created_by: string
          definition: string
          id: string
          is_global: boolean
          organization_name: string | null
          term: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          definition: string
          id?: string
          is_global?: boolean
          organization_name?: string | null
          term: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          definition?: string
          id?: string
          is_global?: boolean
          organization_name?: string | null
          term?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          expires_at: string | null
          file_path: string | null
          file_url: string | null
          id: string
          manual_id: string
          file_size_bytes: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          revision_id: string | null
          status: Database["public"]["Enums"]["export_status"]
          variant: Database["public"]["Enums"]["export_variant"]
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          manual_id: string
          file_size_bytes?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          revision_id?: string | null
          status?: Database["public"]["Enums"]["export_status"]
          variant: Database["public"]["Enums"]["export_variant"]
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          manual_id?: string
          file_size_bytes?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          revision_id?: string | null
          status?: Database["public"]["Enums"]["export_status"]
          variant?: Database["public"]["Enums"]["export_variant"]
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      field_history: {
        Row: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at: string
          changed_by: string
          field_name: string
          id: string
          manual_id: string
          new_value: Json | null
          old_value: Json | null
          record_id: string
          revision_id: string | null
          table_name: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["change_type"]
          changed_at?: string
          changed_by: string
          field_name: string
          id?: string
          manual_id: string
          new_value?: Json | null
          old_value?: Json | null
          record_id: string
          revision_id?: string | null
          table_name: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["change_type"]
          changed_at?: string
          changed_by?: string
          field_name?: string
          id?: string
          manual_id?: string
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string
          revision_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_history_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_history_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "revisions"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_abbreviations: {
        Row: {
          abbreviation_id: string
          created_at: string
          created_by: string
          display_order: number
          id: string
          manual_id: string
        }
        Insert: {
          abbreviation_id: string
          created_at?: string
          created_by: string
          display_order: number
          id?: string
          manual_id: string
        }
        Update: {
          abbreviation_id?: string
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          manual_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_abbreviations_abbreviation_id_fkey"
            columns: ["abbreviation_id"]
            isOneToOne: false
            referencedRelation: "abbreviations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_abbreviations_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_definitions: {
        Row: {
          created_at: string
          created_by: string
          definition_id: string
          display_order: number
          id: string
          manual_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          definition_id: string
          display_order: number
          id?: string
          manual_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          definition_id?: string
          display_order?: number
          id?: string
          manual_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_definitions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_definitions_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      manuals: {
        Row: {
          cover_logo_url: string | null
          created_at: string
          created_by: string
          current_revision: string
          description: string | null
          effective_date: string | null
          id: string
          is_archived: boolean
          language: string | null
          manual_code: string
          metadata: Json | null
          organization_name: string
          reference_number: string | null
          review_due_date: string | null
          status: Database["public"]["Enums"]["manual_status"]
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cover_logo_url?: string | null
          created_at?: string
          created_by: string
          current_revision?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          is_archived?: boolean
          language?: string | null
          manual_code: string
          metadata?: Json | null
          organization_name: string
          reference_number?: string | null
          review_due_date?: string | null
          status?: Database["public"]["Enums"]["manual_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cover_logo_url?: string | null
          created_at?: string
          created_by?: string
          current_revision?: string
          description?: string | null
          effective_date?: string | null
          id?: string
          is_archived?: boolean
          language?: string | null
          manual_code?: string
          metadata?: Json | null
          organization_name?: string
          reference_number?: string | null
          review_due_date?: string | null
          status?: Database["public"]["Enums"]["manual_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      organization_settings: {
        Row: {
          auto_increment_revision: boolean
          created_at: string
          default_review_days: number
          footer_text: string | null
          id: string
          logo_url: string | null
          organization_name: string
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          auto_increment_revision?: boolean
          created_at?: string
          default_review_days?: number
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_name: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          auto_increment_revision?: boolean
          created_at?: string
          default_review_days?: number
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          organization_name?: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      reference_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          changes_summary: string | null
          chapters_affected: string[] | null
          created_at: string
          created_by: string
          id: string
          manual_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          revision_number: string
          snapshot: Json
          status: Database["public"]["Enums"]["revision_status"]
          submitted_by: string | null
          submitted_for_review_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          changes_summary?: string | null
          chapters_affected?: string[] | null
          created_at?: string
          created_by: string
          id?: string
          manual_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          revision_number: string
          snapshot: Json
          status?: Database["public"]["Enums"]["revision_status"]
          submitted_by?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          changes_summary?: string | null
          chapters_affected?: string[] | null
          created_at?: string
          created_by?: string
          id?: string
          manual_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          revision_number?: string
          snapshot?: Json
          status?: Database["public"]["Enums"]["revision_status"]
          submitted_by?: string | null
          submitted_for_review_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisions_manual_id_fkey"
            columns: ["manual_id"]
            isOneToOne: false
            referencedRelation: "manuals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_activity_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          session_timeout_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_activity_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_exports: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_next_revision_number: {
        Args: { p_is_draft?: boolean; p_manual_id: string }
        Returns: string
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_sysadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      change_type: "created" | "updated" | "deleted"
      export_status: "pending" | "processing" | "completed" | "failed"
      export_variant: "draft_watermarked" | "draft_diff" | "clean_approved"
      manual_status: "draft" | "in_review" | "approved" | "rejected"
      revision_status: "draft" | "in_review" | "approved" | "rejected"
      user_role: "manager" | "sysadmin"
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
      change_type: ["created", "updated", "deleted"],
      export_status: ["pending", "processing", "completed", "failed"],
      export_variant: ["draft_watermarked", "draft_diff", "clean_approved"],
      manual_status: ["draft", "in_review", "approved", "rejected"],
      revision_status: ["draft", "in_review", "approved", "rejected"],
      user_role: ["manager", "sysadmin"],
    },
  },
} as const
