import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupTestUsers,
  createTestUser,
} from "../helpers/test-data";

describe("profile bootstrap", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("creates a profile row after auth user creation", async () => {
    const created = await createTestUser("profile-bootstrap", {
      displayName: "Profile Bootstrap Test",
    });

    createdUserIds.push(created.user.id);

    expect(created.profile.id).toBe(created.user.id);
    expect(created.profile.email).toBe(created.email);
    expect(created.profile.display_name).toBe("Profile Bootstrap Test");
    expect(created.profile.system_role).toBe("user");
    expect(created.profile.locale).toBe("pl");
    expect(created.profile.timezone).toBe("Europe/Warsaw");
  });
});
