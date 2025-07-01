export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      daily_prompts: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          prompt_text_en: string | null;
          prompt_text_tr: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          prompt_text_en?: string | null;
          prompt_text_tr: string;
          updated_at?: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          prompt_text_en?: string | null;
          prompt_text_tr?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gratitude_benefits: {
        Row: {
          created_at: string | null;
          cta_prompt_tr: string | null;
          description_tr: string;
          display_order: number;
          icon: string;
          id: number;
          is_active: boolean | null;
          stat_tr: string | null;
          title_tr: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cta_prompt_tr?: string | null;
          description_tr: string;
          display_order?: number;
          icon: string;
          id?: number;
          is_active?: boolean | null;
          stat_tr?: string | null;
          title_tr: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cta_prompt_tr?: string | null;
          description_tr?: string;
          display_order?: number;
          icon?: string;
          id?: number;
          is_active?: boolean | null;
          stat_tr?: string | null;
          title_tr?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      gratitude_entries: {
        Row: {
          created_at: string;
          entry_date: string;
          id: string;
          statements: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          id?: string;
          statements?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          id?: string;
          statements?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          expo_ticket_id: string | null;
          id: string;
          notification_type: string;
          sent_at: string | null;
          success: boolean;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          expo_ticket_id?: string | null;
          id?: string;
          notification_type: string;
          sent_at?: string | null;
          success?: boolean;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          expo_ticket_id?: string | null;
          id?: string;
          notification_type?: string;
          sent_at?: string | null;
          success?: boolean;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          daily_gratitude_goal: number | null;
          expo_push_token: string | null;
          id: string;
          notifications_enabled: boolean | null;
          onboarded: boolean;
          push_notification_failures: number | null;
          push_notifications_enabled: boolean | null;
          push_token_updated_at: string | null;
          reminder_enabled: boolean;
          throwback_reminder_enabled: boolean;
          updated_at: string;
          use_varied_prompts: boolean;
          username: string | null;
        };
        Insert: {
          created_at?: string | null;
          daily_gratitude_goal?: number | null;
          expo_push_token?: string | null;
          id: string;
          notifications_enabled?: boolean | null;
          onboarded?: boolean;
          push_notification_failures?: number | null;
          push_notifications_enabled?: boolean | null;
          push_token_updated_at?: string | null;
          reminder_enabled?: boolean;
          throwback_reminder_enabled?: boolean;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Update: {
          created_at?: string | null;
          daily_gratitude_goal?: number | null;
          expo_push_token?: string | null;
          id?: string;
          notifications_enabled?: boolean | null;
          onboarded?: boolean;
          push_notification_failures?: number | null;
          push_notifications_enabled?: boolean | null;
          push_token_updated_at?: string | null;
          reminder_enabled?: boolean;
          throwback_reminder_enabled?: boolean;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Relationships: [];
      };
      push_notifications: {
        Row: {
          body: string;
          created_at: string | null;
          data: Json | null;
          error_message: string | null;
          expo_receipt_id: string | null;
          id: string;
          notification_type: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          status: string | null;
          title: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          data?: Json | null;
          error_message?: string | null;
          expo_receipt_id?: string | null;
          id?: string;
          notification_type?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          status?: string | null;
          title: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          data?: Json | null;
          error_message?: string | null;
          expo_receipt_id?: string | null;
          id?: string;
          notification_type?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          status?: string | null;
          title?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      push_tokens: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean;
          platform: string;
          token: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          platform: string;
          token: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean;
          platform?: string;
          token?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      streaks: {
        Row: {
          created_at: string;
          current_streak: number;
          id: string;
          last_entry_date: string | null;
          longest_streak: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_entry_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_streak?: number;
          id?: string;
          last_entry_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_gratitude_statement: {
        Args: { p_entry_date: string; p_statement: string };
        Returns: undefined;
      };
      bytea_to_text: {
        Args: { data: string };
        Returns: string;
      };
      calculate_streak: {
        Args: { p_user_id: string };
        Returns: number;
      };
      check_expo_ticket_status: {
        Args: { ticket_id: string };
        Returns: Json;
      };
      check_username_availability: {
        Args: { p_username: string };
        Returns: boolean;
      };
      debug_expo_push: {
        Args: { test_token: string; title: string; body: string };
        Returns: Json;
      };
      debug_send_push_notifications: {
        Args: { notification_type: string; title: string; body: string };
        Returns: {
          user_id: string;
          username: string;
          token_preview: string;
          status: string;
        }[];
      };
      delete_gratitude_entry_by_date: {
        Args: { p_entry_date: string };
        Returns: undefined;
      };
      delete_gratitude_statement: {
        Args: { p_entry_date: string; p_statement_index: number };
        Returns: undefined;
      };
      edit_gratitude_statement: {
        Args: {
          p_entry_date: string;
          p_statement_index: number;
          p_updated_statement: string;
        };
        Returns: undefined;
      };
      get_entry_dates_for_month: {
        Args: { p_user_id: string; p_year: number; p_month: number };
        Returns: string[];
      };
      get_multiple_random_active_prompts: {
        Args: { p_limit?: number };
        Returns: {
          category: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          prompt_text_en: string | null;
          prompt_text_tr: string;
          updated_at: string;
        }[];
      };
      get_random_active_prompt: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          prompt_text_tr: string;
          category: string;
        }[];
      };
      get_random_gratitude_entry: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          entry_date: string;
          id: string;
          statements: Json;
          updated_at: string;
          user_id: string;
        }[];
      };
      get_user_gratitude_entries_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_users_for_daily_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          expo_push_token: string;
          reminder_time: string;
          username: string;
        }[];
      };
      get_users_for_throwback_reminders: {
        Args: { p_frequency?: string };
        Returns: {
          id: string;
          expo_push_token: string;
          throwback_reminder_time: string;
          username: string;
        }[];
      };
      http: {
        Args: { request: Database['public']['CompositeTypes']['http_request'] };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_delete: {
        Args: { uri: string } | { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_get: {
        Args: { uri: string } | { uri: string; data: Json };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_head: {
        Args: { uri: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_header: {
        Args: { field: string; value: string };
        Returns: Database['public']['CompositeTypes']['http_header'];
      };
      http_list_curlopt: {
        Args: Record<PropertyKey, never>;
        Returns: {
          curlopt: string;
          value: string;
        }[];
      };
      http_patch: {
        Args: { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_post: {
        Args: { uri: string; content: string; content_type: string } | { uri: string; data: Json };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_put: {
        Args: { uri: string; content: string; content_type: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
      };
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      http_set_curlopt: {
        Args: { curlopt: string; value: string };
        Returns: boolean;
      };
      normalize_turkish: {
        Args: { input_text: string };
        Returns: string;
      };
      recalculate_user_streak: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      register_push_token: {
        Args: { p_user_id: string; p_expo_push_token: string };
        Returns: undefined;
      };
      schedule_push_notification: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_body: string;
          p_data?: Json;
          p_notification_type?: string;
          p_scheduled_for?: string;
        };
        Returns: string;
      };
      send_daily_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      send_push_notification_to_user: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_body: string;
          p_data?: Json;
          p_notification_type?: string;
        };
        Returns: string;
      };
      send_push_notifications: {
        Args: { notification_type: string; title: string; body: string };
        Returns: number;
      };
      send_throwback_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      set_daily_gratitude_statements: {
        Args: { p_entry_date: string; p_statements: Json };
        Returns: undefined;
      };
      text_to_bytea: {
        Args: { data: string };
        Returns: string;
      };
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      http_header: {
        field: string | null;
        value: string | null;
      };
      http_request: {
        method: unknown | null;
        uri: string | null;
        headers: Database['public']['CompositeTypes']['http_header'][] | null;
        content_type: string | null;
        content: string | null;
      };
      http_response: {
        status: number | null;
        content_type: string | null;
        headers: Database['public']['CompositeTypes']['http_header'][] | null;
        content: string | null;
      };
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
