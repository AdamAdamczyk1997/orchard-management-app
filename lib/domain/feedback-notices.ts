import { normalizeNextPath } from "@/lib/utils/navigation";
import { buildPathWithSearchParams } from "@/lib/utils/search-params";

export const FEEDBACK_NOTICE_QUERY_PARAM = "notice";

const FEEDBACK_NOTICE_MESSAGES = {
  plot_created: "Dzialka zostala utworzona.",
  plot_updated: "Dzialka zostala zapisana.",
  plot_archived: "Dzialka zostala zarchiwizowana.",
  plot_restored: "Dzialka zostala przywrocona.",
  tree_created: "Drzewo zostalo utworzone.",
  tree_updated: "Drzewo zostalo zapisane.",
  tree_batch_created: "Zakres drzew zostal utworzony.",
  trees_bulk_deactivated: "Wybrane drzewa zostaly oznaczone jako usuniete.",
  variety_created: "Odmiana zostala utworzona.",
  variety_updated: "Odmiana zostala zapisana.",
  activity_created: "Aktywnosc zostala utworzona.",
  activity_updated: "Aktywnosc zostala zapisana.",
  activity_status_changed: "Status aktywnosci zostal zaktualizowany.",
  activity_deleted: "Aktywnosc zostala usunieta.",
  harvest_created: "Wpis zbioru zostal utworzony.",
  harvest_updated: "Wpis zbioru zostal zapisany.",
  harvest_deleted: "Wpis zbioru zostal usuniety.",
} as const;

export type FeedbackNoticeCode = keyof typeof FEEDBACK_NOTICE_MESSAGES;

export type FeedbackNotice = {
  code: FeedbackNoticeCode;
  message: string;
};

export function isFeedbackNoticeCode(
  value: string | null | undefined,
): value is FeedbackNoticeCode {
  if (!value) {
    return false;
  }

  return value in FEEDBACK_NOTICE_MESSAGES;
}

export function resolveFeedbackNotice(
  value: string | null | undefined,
): FeedbackNotice | null {
  if (!isFeedbackNoticeCode(value)) {
    return null;
  }

  return {
    code: value,
    message: FEEDBACK_NOTICE_MESSAGES[value],
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
