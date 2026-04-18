import { describe, expect, it } from "vitest";
import {
  pickPreferredActiveOrchard,
} from "@/lib/orchard-context/resolve-active-orchard";

describe("pickPreferredActiveOrchard", () => {
  it("prefers owner membership over worker membership", () => {
    const result = pickPreferredActiveOrchard([
      {
        orchard: {
          id: "orchard-worker",
          name: "Worker Orchard",
          code: null,
          status: "active",
          my_role: "worker",
          membership_status: "active",
        },
        membership: {
          id: "membership-worker",
          orchard_id: "orchard-worker",
          profile_id: "profile-1",
          role: "worker",
          status: "active",
          joined_at: "2026-04-18T09:00:00Z",
        },
        orchard_created_at: "2026-04-18T09:00:00Z",
      },
      {
        orchard: {
          id: "orchard-owner",
          name: "Owner Orchard",
          code: null,
          status: "active",
          my_role: "owner",
          membership_status: "active",
        },
        membership: {
          id: "membership-owner",
          orchard_id: "orchard-owner",
          profile_id: "profile-1",
          role: "owner",
          status: "active",
          joined_at: "2026-04-17T09:00:00Z",
        },
        orchard_created_at: "2026-04-17T09:00:00Z",
      },
    ]);

    expect(result?.orchard.id).toBe("orchard-owner");
  });

  it("falls back to the newest joined membership when roles are equal", () => {
    const result = pickPreferredActiveOrchard([
      {
        orchard: {
          id: "orchard-older",
          name: "Older",
          code: null,
          status: "active",
          my_role: "worker",
          membership_status: "active",
        },
        membership: {
          id: "membership-older",
          orchard_id: "orchard-older",
          profile_id: "profile-1",
          role: "worker",
          status: "active",
          joined_at: "2026-04-15T09:00:00Z",
        },
        orchard_created_at: "2026-04-15T09:00:00Z",
      },
      {
        orchard: {
          id: "orchard-newer",
          name: "Newer",
          code: null,
          status: "active",
          my_role: "worker",
          membership_status: "active",
        },
        membership: {
          id: "membership-newer",
          orchard_id: "orchard-newer",
          profile_id: "profile-1",
          role: "worker",
          status: "active",
          joined_at: "2026-04-16T09:00:00Z",
        },
        orchard_created_at: "2026-04-16T09:00:00Z",
      },
    ]);

    expect(result?.orchard.id).toBe("orchard-newer");
  });
});
