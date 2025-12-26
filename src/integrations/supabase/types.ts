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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          reward_id: string | null
          reward_type: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value?: number
          reward_id?: string | null
          reward_type?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          reward_id?: string | null
          reward_type?: string | null
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          challenge_date: string
          challenge_type: string
          completed: boolean
          created_at: string
          current_value: number
          id: string
          reward_claimed: boolean
          target_value: number
          user_id: string
        }
        Insert: {
          challenge_date?: string
          challenge_type: string
          completed?: boolean
          created_at?: string
          current_value?: number
          id?: string
          reward_claimed?: boolean
          target_value: number
          user_id: string
        }
        Update: {
          challenge_date?: string
          challenge_type?: string
          completed?: boolean
          created_at?: string
          current_value?: number
          id?: string
          reward_claimed?: boolean
          target_value?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          claim_date: string
          created_at: string
          id: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Insert: {
          claim_date?: string
          created_at?: string
          id?: string
          reward_type: string
          reward_value: string
          user_id: string
        }
        Update: {
          claim_date?: string
          created_at?: string
          id?: string
          reward_type?: string
          reward_value?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          best_hand: string | null
          created_at: string
          game_mode: Database["public"]["Enums"]["game_mode"]
          hands_played: number
          id: string
          profile_id: string
          score: number
          ssc_level: number | null
          time_seconds: number | null
          user_id: string
        }
        Insert: {
          best_hand?: string | null
          created_at?: string
          game_mode: Database["public"]["Enums"]["game_mode"]
          hands_played?: number
          id?: string
          profile_id: string
          score: number
          ssc_level?: number | null
          time_seconds?: number | null
          user_id: string
        }
        Update: {
          best_hand?: string | null
          created_at?: string
          game_mode?: Database["public"]["Enums"]["game_mode"]
          hands_played?: number
          id?: string
          profile_id?: string
          score?: number
          ssc_level?: number | null
          time_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          highest_ssc_level: number
          id: string
          selected_card_back: string | null
          selected_theme: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          highest_ssc_level?: number
          id?: string
          selected_card_back?: string | null
          selected_theme?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          highest_ssc_level?: number
          id?: string
          selected_card_back?: string | null
          selected_theme?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      unlockables: {
        Row: {
          created_at: string
          id: string
          name: string
          preview_url: string | null
          type: string
          unlock_method: string
          unlock_requirement: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          preview_url?: string | null
          type: string
          unlock_method: string
          unlock_requirement?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          preview_url?: string | null
          type?: string
          unlock_method?: string
          unlock_requirement?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          created_at: string
          fastest_hand_seconds: number | null
          flushes_made: number
          four_of_kinds_made: number
          full_houses_made: number
          highest_score: number
          id: string
          royal_flushes_made: number
          straight_flushes_made: number
          straights_made: number
          total_games: number
          total_hands: number
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fastest_hand_seconds?: number | null
          flushes_made?: number
          four_of_kinds_made?: number
          full_houses_made?: number
          highest_score?: number
          id?: string
          royal_flushes_made?: number
          straight_flushes_made?: number
          straights_made?: number
          total_games?: number
          total_hands?: number
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fastest_hand_seconds?: number | null
          flushes_made?: number
          four_of_kinds_made?: number
          full_houses_made?: number
          highest_score?: number
          id?: string
          royal_flushes_made?: number
          straight_flushes_made?: number
          straights_made?: number
          total_games?: number
          total_hands?: number
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_play_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_play_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_play_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_unlocks: {
        Row: {
          id: string
          unlockable_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          unlockable_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          unlockable_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocks_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      game_mode: "classic_fc" | "classic_cb" | "blitz_fc" | "blitz_cb" | "ssc"
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
      game_mode: ["classic_fc", "classic_cb", "blitz_fc", "blitz_cb", "ssc"],
    },
  },
} as const
