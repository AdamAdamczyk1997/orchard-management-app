import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});
