import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-session-user";

export async function requireSessionUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
