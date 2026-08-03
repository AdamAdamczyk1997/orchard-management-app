import { buildPathWithSearchParams } from "@/lib/utils/search-params";

export function buildHarvestPageHref(
  urlSearchParams: URLSearchParams,
  page: number,
  pageSize: number,
) {
  const params = new URLSearchParams(urlSearchParams);

  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }

  params.set("page_size", String(pageSize));

  return buildPathWithSearchParams("/harvests", params);
}

export function formatHarvestPageRange(
  page: number,
  pageSize: number,
  totalCount: number,
) {
  if (totalCount === 0) {
    return "0 z 0";
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return `${from}-${to} z ${totalCount}`;
}
