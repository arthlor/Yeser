export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
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
          cta_prompt_en: string | null;
          cta_prompt_tr: string | null;
          description_en: string | null;
          description_tr: string;
          display_order: number;
          icon: string;
          id: number;
          is_active: boolean | null;
          stat_en: string | null;
          stat_tr: string | null;
          title_en: string | null;
          title_tr: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cta_prompt_en?: string | null;
          cta_prompt_tr?: string | null;
          description_en?: string | null;
          description_tr: string;
          display_order?: number;
          icon: string;
          id?: number;
          is_active?: boolean | null;
          stat_en?: string | null;
          stat_tr?: string | null;
          title_en?: string | null;
          title_tr: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cta_prompt_en?: string | null;
          cta_prompt_tr?: string | null;
          description_en?: string | null;
          description_tr?: string;
          display_order?: number;
          icon?: string;
          id?: number;
          is_active?: boolean | null;
          stat_en?: string | null;
          stat_tr?: string | null;
          title_en?: string | null;
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
          moods: Json;
          statements: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          id?: string;
          moods?: Json;
          statements?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          id?: string;
          moods?: Json;
          statements?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notification_jobs: {
        Row: {
          attempts: number;
          created_at: string;
          id: string;
          language: string;
          last_error: string | null;
          metadata: Json;
          scheduled_for: string;
          status: string;
          tokens: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: string;
          language?: string;
          last_error?: string | null;
          metadata?: Json;
          scheduled_for: string;
          status?: string;
          tokens: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: string;
          language?: string;
          last_error?: string | null;
          metadata?: Json;
          scheduled_for?: string;
          status?: string;
          tokens?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'notification_windows';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notification_jobs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_logs: {
        Row: {
          delivered_at: string;
          error_detail: Json | null;
          expo_message: string | null;
          expo_status: string | null;
          expo_ticket_id: string | null;
          id: number;
          job_id: string | null;
          token: string | null;
        };
        Insert: {
          delivered_at?: string;
          error_detail?: Json | null;
          expo_message?: string | null;
          expo_status?: string | null;
          expo_ticket_id?: string | null;
          id?: number;
          job_id?: string | null;
          token?: string | null;
        };
        Update: {
          delivered_at?: string;
          error_detail?: Json | null;
          expo_message?: string | null;
          expo_status?: string | null;
          expo_ticket_id?: string | null;
          id?: number;
          job_id?: string | null;
          token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_logs_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'notification_jobs';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string | null;
          daily_gratitude_goal: number | null;
          id: string;
          language: string;
          notification_time: string | null;
          onboarded: boolean;
          timezone: string | null;
          updated_at: string;
          use_varied_prompts: boolean;
          username: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string | null;
          daily_gratitude_goal?: number | null;
          id: string;
          language?: string;
          notification_time?: string | null;
          onboarded?: boolean;
          timezone?: string | null;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string | null;
          daily_gratitude_goal?: number | null;
          id?: string;
          language?: string;
          notification_time?: string | null;
          onboarded?: boolean;
          timezone?: string | null;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string | null;
          id: number;
          token: string;
          token_type: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: never;
          token: string;
          token_type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: never;
          token?: string;
          token_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_tokens_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'notification_windows';
            referencedColumns: ['user_id'];
          },
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
      notification_windows: {
        Row: {
          language: string | null;
          local_next_hour: string | null;
          local_now: string | null;
          notification_time: string | null;
          timezone: string | null;
          tokens: string[] | null;
          user_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_gratitude_statement: {
        Args: { p_entry_date: string; p_mood?: string; p_statement: string };
        Returns: undefined;
      };
      analyze_notification_query_performance: {
        Args: never;
        Returns: {
          execution_time_ms: number;
          notes: string;
          query_step: string;
          rows_processed: number;
        }[];
      };
      bytea_to_text: { Args: { data: string }; Returns: string };
      calculate_streak: { Args: { p_user_id: string }; Returns: number };
      check_username_availability: {
        Args: { p_username: string };
        Returns: boolean;
      };
      cleanup_stale_tokens:
        | { Args: { p_max_age_days?: number }; Returns: number }
        | { Args: never; Returns: number };
      debug_hourly_notification_users: {
        Args: never;
        Returns: {
          current_hour_in_timezone: number;
          next_hour_in_timezone: number;
          notification_hour: number;
          should_notify_next_hour: boolean;
          timezone: string;
          token_count: number;
          user_id: string;
          username: string;
        }[];
      };
      debug_notification_matching: {
        Args: never;
        Returns: {
          current_hour_in_timezone: number;
          next_hour_in_timezone: number;
          notification_hour: number;
          should_notify_next_hour: boolean;
          timezone: string;
          token_count: number;
          user_id: string;
          username: string;
        }[];
      };
      debug_notification_users: {
        Args: never;
        Returns: {
          current_time_in_timezone: string;
          notification_time: string;
          should_notify: boolean;
          timezone: string;
          token_count: number;
          user_id: string;
          username: string;
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
      diagnose_cron_job_permissions: {
        Args: never;
        Returns: {
          check_name: string;
          check_result: string;
          details: string;
        }[];
      };
      edit_gratitude_statement:
        | {
            Args: {
              p_entry_date: string;
              p_mood?: string;
              p_statement_index: number;
              p_updated_statement: string;
            };
            Returns: undefined;
          }
        | {
            Args: {
              p_entry_date: string;
              p_statement_index: number;
              p_updated_statement: string;
            };
            Returns: undefined;
          };
      enqueue_notification_jobs: {
        Args: { p_horizon_minutes?: number };
        Returns: number;
      };
      get_basic_notification_stats: {
        Args: never;
        Returns: {
          description: string;
          stat_name: string;
          stat_value: string;
        }[];
      };
      get_entry_dates_for_month: {
        Args: { p_month: number; p_user_id: string; p_year: number };
        Returns: string[];
      };
      get_mood_analytics: {
        Args: { p_range?: string };
        Returns: Json;
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
        SetofOptions: {
          from: '*';
          to: 'daily_prompts';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_random_active_prompt: {
        Args: never;
        Returns: {
          category: string;
          id: string;
          prompt_text_tr: string;
        }[];
      };
      get_random_gratitude_entry: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          entry_date: string;
          id: string;
          moods: Json;
          statements: Json;
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'gratitude_entries';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_user_gratitude_entries_count: { Args: never; Returns: number };
      get_users_for_next_hour_optimized: {
        Args: never;
        Returns: {
          language: string;
          notification_time: string;
          timezone: string;
          tokens: string[];
          user_id: string;
        }[];
      };
      get_users_to_notify: {
        Args: never;
        Returns: {
          id: string;
          notification_time: string;
          timezone: string;
        }[];
      };
      http: {
        Args: { request: Database['public']['CompositeTypes']['http_request'] };
        Returns: Database['public']['CompositeTypes']['http_response'];
        SetofOptions: {
          from: 'http_request';
          to: 'http_response';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_delete:
        | {
            Args: { uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_get:
        | {
            Args: { uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_head: {
        Args: { uri: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
        SetofOptions: {
          from: '*';
          to: 'http_response';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_header: {
        Args: { field: string; value: string };
        Returns: Database['public']['CompositeTypes']['http_header'];
        SetofOptions: {
          from: '*';
          to: 'http_header';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_list_curlopt: {
        Args: never;
        Returns: {
          curlopt: string;
          value: string;
        }[];
      };
      http_patch: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
        SetofOptions: {
          from: '*';
          to: 'http_response';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          }
        | {
            Args: { data: Json; uri: string };
            Returns: Database['public']['CompositeTypes']['http_response'];
            SetofOptions: {
              from: '*';
              to: 'http_response';
              isOneToOne: true;
              isSetofReturn: false;
            };
          };
      http_put: {
        Args: { content: string; content_type: string; uri: string };
        Returns: Database['public']['CompositeTypes']['http_response'];
        SetofOptions: {
          from: '*';
          to: 'http_response';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      http_reset_curlopt: { Args: never; Returns: boolean };
      http_set_curlopt: {
        Args: { curlopt: string; value: string };
        Returns: boolean;
      };
      insert_notification_logs: { Args: { p_logs: Json }; Returns: undefined };
      lock_notification_jobs: {
        Args: { p_cutoff?: string; p_limit: number };
        Returns: {
          attempts: number;
          created_at: string;
          id: string;
          language: string;
          last_error: string | null;
          metadata: Json;
          scheduled_for: string;
          status: string;
          tokens: string[];
          updated_at: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: '*';
          to: 'notification_jobs';
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      normalize_turkish: { Args: { input_text: string }; Returns: string };
      recalculate_user_streak: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      register_push_token: {
        Args: { p_timezone?: string; p_token: string; p_token_type?: string };
        Returns: Json;
      };
      reset_stuck_notification_jobs: {
        Args: { p_threshold?: unknown };
        Returns: number;
      };
      set_daily_gratitude_statements: {
        Args: { p_entry_date: string; p_statements: Json };
        Returns: undefined;
      };
      set_notifications_enabled: {
        Args: { p_enabled: boolean };
        Returns: undefined;
      };
      set_statement_mood: {
        Args: {
          p_entry_date: string;
          p_mood: string;
          p_statement_index: number;
        };
        Returns: undefined;
      };
      text_to_bytea: { Args: { data: string }; Returns: string };
      trigger_daily_reminders_fixed: { Args: never; Returns: undefined };
      trigger_hourly_reminders: { Args: never; Returns: undefined };
      unregister_push_token: { Args: { p_token: string }; Returns: undefined };
      update_cron_job: {
        Args: { p_jobid: number; p_jobname?: string; p_new_schedule: string };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
          }
        | {
            Args: { string: string };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
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
        method: unknown;
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
