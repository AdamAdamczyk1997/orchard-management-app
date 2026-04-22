export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          system_role: "user" | "super_admin";
          locale: string | null;
          timezone: string | null;
          orchard_onboarding_dismissed_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      orchards: {
        Row: {
          id: string;
          name: string;
          code: string | null;
          description: string | null;
          status: "active" | "archived";
          created_by_profile_id: string;
          created_at: string;
          updated_at: string;
        };
      };
      orchard_memberships: {
        Row: {
          id: string;
          orchard_id: string;
          profile_id: string;
          role: "owner" | "worker" | "manager" | "viewer";
          status: "invited" | "active" | "revoked";
          invited_by_profile_id: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      activities: {
        Row: {
          id: string;
          orchard_id: string;
          plot_id: string;
          tree_id: string | null;
          activity_type:
            | "watering"
            | "fertilizing"
            | "spraying"
            | "pruning"
            | "inspection"
            | "planting"
            | "harvest"
            | "mowing"
            | "weeding"
            | "disease_observation"
            | "pest_observation"
            | "other";
          activity_subtype: "winter_pruning" | "summer_pruning" | null;
          activity_date: string;
          title: string;
          description: string | null;
          status: "planned" | "done" | "skipped" | "cancelled";
          work_duration_minutes: number | null;
          cost_amount: number | null;
          weather_notes: string | null;
          result_notes: string | null;
          performed_by_profile_id: string | null;
          performed_by: string | null;
          created_by_profile_id: string;
          season_year: number;
          season_phase: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      activity_scopes: {
        Row: {
          id: string;
          activity_id: string;
          scope_order: number | null;
          scope_level: "plot" | "section" | "row" | "location_range" | "tree";
          section_name: string | null;
          row_number: number | null;
          from_position: number | null;
          to_position: number | null;
          tree_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      activity_materials: {
        Row: {
          id: string;
          activity_id: string;
          name: string;
          category: string | null;
          quantity: number | null;
          unit: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Functions: {
      create_orchard_with_owner_membership: {
        Args: {
          p_name: string;
          p_code?: string | null;
          p_description?: string | null;
        };
        Returns: {
          orchard_id: string;
          orchard_name: string;
          orchard_code: string | null;
          orchard_status: "active" | "archived";
          membership_id: string;
          membership_role: "owner" | "worker" | "manager" | "viewer";
          membership_status: "invited" | "active" | "revoked";
          membership_joined_at: string | null;
        }[];
      };
      invite_orchard_member_by_email: {
        Args: {
          p_orchard_id: string;
          p_email: string;
          p_role?: "worker" | "manager" | "viewer";
        };
        Returns: {
          membership_id: string;
          orchard_id: string;
          profile_id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "worker" | "manager" | "viewer";
          status: "invited" | "active" | "revoked";
          joined_at: string | null;
        }[];
      };
      create_activity_with_children: {
        Args: {
          p_parent: Json;
          p_scopes?: Json;
          p_materials?: Json;
        };
        Returns: {
          activity_id: string;
        }[];
      };
      update_activity_with_children: {
        Args: {
          p_activity_id: string;
          p_parent: Json;
          p_scopes?: Json;
          p_materials?: Json;
        };
        Returns: {
          activity_id: string;
        }[];
      };
      list_active_orchard_member_options: {
        Args: {
          p_orchard_id: string;
        };
        Returns: {
          profile_id: string;
          email: string;
          display_name: string | null;
          role: "owner" | "worker" | "manager" | "viewer";
        }[];
      };
    };
  };
};
