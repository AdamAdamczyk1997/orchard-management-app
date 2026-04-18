import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/features/auth/profile-form";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";

export default async function ProfileSettingsPage() {
  await requireActiveOrchard("/settings/profile");
  const profile = await readCurrentProfile();

  if (!profile) {
    throw new Error("Profile is required to render the profile settings page.");
  }

  return (
    <Card className="grid gap-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Account settings
        </p>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          This page updates user-level information only. Orchard working context and membership stay separate.
        </CardDescription>
      </div>
      <ProfileForm profile={profile} />
    </Card>
  );
}
