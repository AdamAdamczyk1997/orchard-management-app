import { normalizeNextPath } from "@/lib/utils/navigation";
import { buildPathWithSearchParams } from "@/lib/utils/search-params";

export const FEEDBACK_NOTICE_QUERY_PARAM = "notice";

const FEEDBACK_NOTICE_DEFINITIONS = {
  plot_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Dzialka zostala utworzona.",
  },
  plot_updated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Dzialka zostala zapisana.",
  },
  plot_archived: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Dzialka zostala zarchiwizowana.",
  },
  plot_restored: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Dzialka zostala przywrocona.",
  },
  tree_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Drzewo zostalo utworzone.",
  },
  tree_updated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Drzewo zostalo zapisane.",
  },
  tree_batch_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Zakres drzew zostal utworzony.",
  },
  trees_bulk_deactivated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Wybrane drzewa zostaly oznaczone jako usuniete.",
  },
  variety_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Odmiana zostala utworzona.",
  },
  variety_updated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Odmiana zostala zapisana.",
  },
  activity_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Aktywnosc zostala utworzona.",
  },
  activity_updated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Aktywnosc zostala zapisana.",
  },
  activity_status_changed: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Status aktywnosci zostal zaktualizowany.",
  },
  activity_deleted: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Aktywnosc zostala usunieta.",
  },
  harvest_created: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Wpis zbioru zostal utworzony.",
  },
  harvest_updated: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Wpis zbioru zostal zapisany.",
  },
  harvest_deleted: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Wpis zbioru zostal usuniety.",
  },
  orchard_switch_unavailable: {
    tone: "warning",
    eyebrow: "Uwaga",
    title: "Aktywny sad bez zmian",
    message:
      "Nie udalo sie przelaczyc aktywnego sadu. Odswiez widok i wybierz sad ponownie.",
  },
  member_revoked: {
    tone: "success",
    eyebrow: "Gotowe",
    title: "Zmiany zapisane",
    message: "Aktywny dostep czlonka do sadu zostal odebrany.",
  },
  member_revoke_blocked: {
    tone: "warning",
    eyebrow: "Uwaga",
    title: "Nie zapisano zmian",
    message:
      "Nie udalo sie odebrac dostepu dla wskazanego czlonka. Odswiez widok i sprobuj ponownie.",
  },
} as const;

export type FeedbackNoticeCode = keyof typeof FEEDBACK_NOTICE_DEFINITIONS;

export type FeedbackNotice = {
  code: FeedbackNoticeCode;
  tone: "success" | "warning";
  eyebrow: string;
  title: string;
  message: string;
};

export function isFeedbackNoticeCode(
  value: string | null | undefined,
): value is FeedbackNoticeCode {
  if (!value) {
    return false;
  }

  return value in FEEDBACK_NOTICE_DEFINITIONS;
}

export function resolveFeedbackNotice(
  value: string | null | undefined,
): FeedbackNotice | null {
  if (!isFeedbackNoticeCode(value)) {
    return null;
  }

  return {
    code: value,
    ...FEEDBACK_NOTICE_DEFINITIONS[value],
  };
}

export function buildRedirectTargetWithNotice(
  path: string | null | undefined,
  notice: FeedbackNoticeCode,
  fallback = "/",
) {
  const normalizedPath = normalizeNextPath(path, fallback);
  const parsedPath = new URL(normalizedPath, "http://localhost");

  parsedPath.searchParams.set(FEEDBACK_NOTICE_QUERY_PARAM, notice);

  return `${buildPathWithSearchParams(parsedPath.pathname, parsedPath.searchParams)}${parsedPath.hash}`;
}
