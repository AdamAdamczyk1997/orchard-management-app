import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of fileContents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function loadLocalEnv(projectRoot = process.cwd()) {
  loadEnvFile(path.join(projectRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env.test.local"));
}

export function readLocalSupabaseProjectId(projectRoot = process.cwd()) {
  const configPath = path.join(projectRoot, "supabase", "config.toml");

  if (fs.existsSync(configPath)) {
    const configContents = fs.readFileSync(configPath, "utf8");
    const projectIdMatch = configContents.match(/^\s*project_id\s*=\s*"([^"]+)"/m);

    if (projectIdMatch?.[1]) {
      return projectIdMatch[1];
    }
  }

  return path.basename(projectRoot);
}

export function resolveLocalSupabaseDbContainerName(projectRoot = process.cwd()) {
  const override = process.env.SUPABASE_LOCAL_DB_CONTAINER_NAME?.trim();

  if (override) {
    return override;
  }

  return `supabase_db_${readLocalSupabaseProjectId(projectRoot)}`;
}

export function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function createLocalAdminClient(projectRoot = process.cwd()) {
  loadLocalEnv(projectRoot);

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getRequiredEnv("SUPABASE_SECRET_KEY");

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function listAllAuthUsers(adminClient) {
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const batch = data.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}
