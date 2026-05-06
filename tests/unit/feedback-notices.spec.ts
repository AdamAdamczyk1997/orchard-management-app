import { describe, expect, it } from "vitest";
import {
  buildRedirectTargetWithNotice,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { toUrlSearchParams } from "@/lib/utils/search-params";

describe("feedback notice helpers", () => {
  it("resolves only supported notice codes", () => {
    expect(resolveFeedbackNotice("plot_created")).toEqual({
      code: "plot_created",
      tone: "success",
      eyebrow: "Gotowe",
      title: "Zmiany zapisane",
      message: "Dzialka zostala utworzona.",
    });
    expect(resolveFeedbackNotice("orchard_switch_unavailable")).toEqual({
      code: "orchard_switch_unavailable",
      tone: "warning",
      eyebrow: "Uwaga",
      title: "Aktywny sad bez zmian",
      message:
        "Nie udalo sie przelaczyc aktywnego sadu. Odswiez widok i wybierz sad ponownie.",
    });
    expect(resolveFeedbackNotice("unknown")).toBeNull();
    expect(resolveFeedbackNotice(undefined)).toBeNull();
  });

  it("appends a success notice to normalized redirect targets", () => {
    expect(buildRedirectTargetWithNotice("/plots", "plot_created")).toBe(
      "/plots?notice=plot_created",
    );
    expect(
      buildRedirectTargetWithNotice(
        "/activities?status=done",
        "activity_deleted",
      ),
    ).toBe("/activities?status=done&notice=activity_deleted");
    expect(buildRedirectTargetWithNotice("https://evil.test", "tree_created", "/trees")).toBe(
      "/trees?notice=tree_created",
    );
  });

  it("converts next search params into URLSearchParams and can exclude feedback", () => {
    const params = toUrlSearchParams(
      {
        status: "done",
        performed_by_profile_id: "profile-1",
        notice: "activity_created",
      },
      {
        excludeKeys: ["notice"],
      },
    );

    expect(params.toString()).toBe("status=done&performed_by_profile_id=profile-1");
  });
});
