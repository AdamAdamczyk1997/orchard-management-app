function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required test environment variable: ${name}`);
  }

  return value;
}

export function getTestSupabaseConfig() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    secretKey: getRequiredEnv("SUPABASE_SECRET_KEY"),
  };
}
