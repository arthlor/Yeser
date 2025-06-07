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
      profiles: {
        Row: {
          daily_gratitude_goal: number | null;
          id: string;
          onboarded: boolean;
          reminder_enabled: boolean;
          reminder_time: string;
          throwback_reminder_enabled: boolean;
          throwback_reminder_frequency: string;
          throwback_reminder_time: string | null;
          updated_at: string;
          use_varied_prompts: boolean;
          username: string | null;
        };
        Insert: {
          daily_gratitude_goal?: number | null;
          id: string;
          onboarded?: boolean;
          reminder_enabled?: boolean;
          reminder_time?: string;
          throwback_reminder_enabled?: boolean;
          throwback_reminder_frequency?: string;
          throwback_reminder_time?: string | null;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Update: {
          daily_gratitude_goal?: number | null;
          id?: string;
          onboarded?: boolean;
          reminder_enabled?: boolean;
          reminder_time?: string;
          throwback_reminder_enabled?: boolean;
          throwback_reminder_frequency?: string;
          throwback_reminder_time?: string | null;
          updated_at?: string;
          use_varied_prompts?: boolean;
          username?: string | null;
        };
        Relationships: [];
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
      calculate_streak: {
        Args: { p_user_id: string };
        Returns: number;
      };
      check_username_availability: {
        Args: { p_username: string };
        Returns: boolean;
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
      normalize_turkish: {
        Args: { input_text: string };
        Returns: string;
      };
      recalculate_user_streak: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      set_daily_gratitude_statements: {
        Args: { p_entry_date: string; p_statements: Json };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
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
