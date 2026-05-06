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
    expect(redirectMock).toHaveBeenCalledWith(
      "/settings/members?notice=member_revoke_blocked",
    );
  });

  it("keeps the current route when switching the active orchard", async () => {
    requireSessionUserMock.mockResolvedValue({ id: "owner-profile" });
    listAccessibleOrchardsMock.mockResolvedValue([
      {
        orchard: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Sad glowny",
        },
      },
      {
        orchard: {
          id: "22222222-2222-4222-8222-222222222222",
          name: "Sad poludniowy",
        },
      },
    ]);

    const { setActiveOrchard } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("orchard_id", "22222222-2222-4222-8222-222222222222");
    formData.set("next_path", "/plots?status=active");

    await expect(setActiveOrchard(formData)).rejects.toThrow("REDIRECT");
    expect(persistActiveOrchardCookieMock).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(redirectMock).toHaveBeenCalledWith("/plots?status=active");
  });

  it("redirects with a warning notice when the requested orchard is unavailable", async () => {
    requireSessionUserMock.mockResolvedValue({ id: "owner-profile" });
    listAccessibleOrchardsMock.mockResolvedValue([
      {
        orchard: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Sad glowny",
        },
      },
    ]);

    const { setActiveOrchard } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("orchard_id", "22222222-2222-4222-8222-222222222222");
    formData.set("next_path", "/trees");

    await expect(setActiveOrchard(formData)).rejects.toThrow("REDIRECT");
    expect(persistActiveOrchardCookieMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith(
      "/dashboard?notice=orchard_switch_unavailable",
    );
  });

  it("shows a success notice after revoking an active non-owner membership", async () => {
    listOrchardMembersForOrchardMock.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        orchard_id: "orchard-1",
        profile_id: "worker-profile",
        email: "worker@orchardlog.local",
        display_name: "Worker",
        role: "worker",
        status: "active",
        joined_at: "2026-04-19T08:00:00Z",
      },
    ]);

    const eqSecondMock = vi.fn().mockResolvedValue({ error: null });
    const eqFirstMock = vi.fn().mockReturnValue({ eq: eqSecondMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqFirstMock });
    const fromMock = vi.fn().mockReturnValue({ update: updateMock });
    createSupabaseServerClientMock.mockResolvedValue({
      from: fromMock,
    });

    const { deactivateOrchardMembership } = await import("@/server/actions/orchards");
    const formData = new FormData();
    formData.set("membership_id", "11111111-1111-4111-8111-111111111111");

    await expect(deactivateOrchardMembership(formData)).rejects.toThrow("REDIRECT");
    expect(fromMock).toHaveBeenCalledWith("orchard_memberships");
    expect(updateMock).toHaveBeenCalledWith({ status: "revoked" });
    expect(redirectMock).toHaveBeenCalledWith(
      "/settings/members?notice=member_revoked",
    );
  });
});
