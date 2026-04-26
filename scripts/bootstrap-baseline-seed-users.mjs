import {
  BASELINE_USERS,
  DEFAULT_BASELINE_PASSWORD,
} from "./shared/baseline-seed.mjs";
import {
  createLocalAdminClient,
  listAllAuthUsers,
} from "./shared/local-supabase.mjs";

function resolveBaselinePassword() {
  return process.env.BASELINE_SEED_USER_PASSWORD || DEFAULT_BASELINE_PASSWORD;
}

async function upsertBaselineUsers() {
  const password = resolveBaselinePassword();
  const adminClient = createLocalAdminClient();
  const existingUsers = await listAllAuthUsers(adminClient);
  const existingUsersByEmail = new Map(
    existingUsers
      .filter((user) => typeof user.email === "string")
      .map((user) => [user.email.toLowerCase(), user]),
  );

  const summary = {
    created: 0,
    updated: 0,
  };

  for (const baselineUser of BASELINE_USERS) {
    const existingUser = existingUsersByEmail.get(baselineUser.email.toLowerCase());

    if (!existingUser) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: baselineUser.email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: baselineUser.displayName,
          locale: "pl",
          timezone: "Europe/Warsaw",
        },
      });

      if (error) {
        throw error;
      }

      summary.created += 1;
      console.log(`[created] ${baselineUser.email} (${data.user?.id ?? "no-id"})`);
      continue;
    }

    const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        display_name: baselineUser.displayName,
        locale: "pl",
        timezone: "Europe/Warsaw",
      },
    });

    if (error) {
      throw error;
    }

    summary.updated += 1;
    console.log(`[updated] ${baselineUser.email} (${existingUser.id})`);
  }

  console.log("");
  console.log("Baseline auth users are ready.");
  console.log(`Created: ${summary.created}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Password: ${password}`);
  console.log("");
  console.log("Next step:");
  console.log("- run supabase/seeds/001_baseline_reference_seed.sql");
  console.log("- then log in with one of the baseline accounts");
}

upsertBaselineUsers().catch((error) => {
  console.error("");
  console.error("Failed to bootstrap baseline seed users.");
  console.error(
    "Make sure local Supabase is running and .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
  );
  console.error("");
  console.error(error);
  process.exitCode = 1;
});
