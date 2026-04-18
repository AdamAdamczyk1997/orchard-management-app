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
    };
  };
};
