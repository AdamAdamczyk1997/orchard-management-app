import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getTestSupabaseConfig } from "./env";

type ClientOptions = {
  auth?: {
    persistSession?: boolean;
    autoRefreshToken?: boolean;
    detectSessionInUrl?: boolean;
  };
};

const defaultClientOptions: ClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

export function createAdminClient(): SupabaseClient<any> {
  const { url, secretKey } = getTestSupabaseConfig();

  return createClient(url, secretKey, defaultClientOptions);
}

export function createAnonClient(): SupabaseClient<any> {
  const { url, anonKey } = getTestSupabaseConfig();

  return createClient(url, anonKey, defaultClientOptions);
}
