import { beforeEach, describe, expect, it, vi } from "vitest";

const readCurrentProfileMock = vi.fn();
const requireSessionUserMock = vi.fn();
const persistActiveOrchardCookieMock = vi.fn();
const listAccessibleOrchardsMock = vi.fn();
const resolveActiveOrchardContextMock = vi.fn();
const listOrchardMembersForOrchardMock = vi.fn();
const readOrchardDetailsForOrchardMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/auth/get-current-profile", () => ({
  readCurrentProfile: readCurrentProfileMock,
}));

vi.mock("@/lib/auth/require-session-user", () => ({
  requireSessionUser: requireSessionUserMock,
}));

vi.mock("@/lib/orchard-context/active-orchard-cookie", () => ({
  persistActiveOrchardCookie: persistActiveOrchardCookieMock,
}));

vi.mock("@/lib/orchard-context/list-accessible-orchards", () => ({
  listAccessibleOrchards: listAccessibleOrchardsMock,
}));

vi.mock("@/lib/orchard-context/resolve-active-orchard", () => ({
  resolveActiveOrchardContext: resolveActiveOrchardContextMock,
}));

vi.mock("@/lib/orchard-data/orchards", () => ({
  listOrchardMembersForOrchard: listOrchardMembersForOrchardMock,
  readOrchardDetailsForOrchard: readOrchardDetailsForOrchardMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("orchard management server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    redirectMock.mockImplementation(() => {
      throw new Error("REDIRECT");
    });

    resolveActiveOrchardContextMock.mockResolvedValue({
      authenticated: true,
      profile: {
        id: "owner-profile",
        email: "owner@orchardlog.local",
      },
      orchard: {
        id: "orchard-1",
        name: "Sad testowy",
      },
      membership: {
        id: "membership-owner",
        orchard_id: "orchard-1",
        profile_id: "owner-profile",
        role: "owner",
        status: "active",
      },
    });
  });

  it("rejects orchard settings updates for a worker before touching the database", async () => {
    resolveActiveOrchardContextMock.mockResolvedValue({
      authenticated: true,
      profile: {
        id: "worker-profile",
        email: "worker@orchardlog.local",
      },
      orchard: {
        id: "orchard-1",
        name: "Sad testowy",
      },
      membership: {
        id: "membership-worker",
        orchard_id: "orchard-1",
        profile_id: "worker-profile",
        role: "worker",
        status: "active",
      },
    });

    const { updateOrchard } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("name", "Nowy sad");

    const result = await updateOrchard({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("FORBIDDEN");
    expect(readOrchardDetailsForOrchardMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("maps missing profile errors when inviting a member by email", async () => {
    createSupabaseServerClientMock.mockResolvedValue({
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "P0001",
            message: "No profile exists for the provided email.",
          },
        }),
      }),
    });

    const { inviteOrchardMember } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("email", "missing@orchardlog.local");
    formData.set("role", "worker");

    const result = await inviteOrchardMember({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("NOT_FOUND");
    expect(result.field_errors?.email).toBe(
      "To konto nie istnieje jeszcze w aplikacji.",
    );
  });

  it("does not revoke the owner membership through the members action", async () => {
    listOrchardMembersForOrchardMock.mockResolvedValue([
      {
        id: "membership-owner",
        orchard_id: "orchard-1",
        profile_id: "owner-profile",
        email: "owner@orchardlog.local",
        display_name: "Owner",
        role: "owner",
        status: "active",
        joined_at: "2026-04-19T08:00:00Z",
      },
    ]);

    const fromMock = vi.fn();
    createSupabaseServerClientMock.mockResolvedValue({
      from: fromMock,
    });

    const { deactivateOrchardMembership } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("membership_id", "membership-owner");

    await expect(deactivateOrchardMembership(formData)).rejects.toThrow("REDIRECT");
    expect(fromMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/settings/members");
  });
});
