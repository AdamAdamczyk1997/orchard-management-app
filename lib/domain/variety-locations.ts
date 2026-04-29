import type { PlotStatus, VarietyLocationGroup, VarietyLocationRange } from "@/types/contracts";

export type VarietyLocationTree = {
  plot_id: string;
  plot_name: string;
  plot_status: PlotStatus;
  section_name?: string | null;
  row_number: number;
  position_in_row: number;
  location_verified: boolean;
};

type RangeAccumulator = VarietyLocationRange;

function compareNullableText(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").localeCompare(right ?? "");
}

export function sortVarietyLocationTrees(
  left: VarietyLocationTree,
  right: VarietyLocationTree,
) {
  const plotDiff = left.plot_name.localeCompare(right.plot_name);

  if (plotDiff !== 0) {
    return plotDiff;
  }

  const sectionDiff = compareNullableText(left.section_name, right.section_name);

  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  if (left.row_number !== right.row_number) {
    return left.row_number - right.row_number;
  }

  return left.position_in_row - right.position_in_row;
}

export function buildVarietyLocationRanges(
  trees: Array<Pick<VarietyLocationTree, "position_in_row" | "location_verified">>,
) {
  const sortedTrees = [...trees].sort(
    (left, right) => left.position_in_row - right.position_in_row,
  );
  const ranges: RangeAccumulator[] = [];

  for (const tree of sortedTrees) {
    const previousRange = ranges.at(-1);

    if (previousRange && tree.position_in_row === previousRange.to_position + 1) {
      previousRange.to_position = tree.position_in_row;
      previousRange.tree_count += 1;

      if (tree.location_verified) {
        previousRange.verified_trees_count += 1;
      } else {
        previousRange.unverified_trees_count += 1;
      }

      continue;
    }

    ranges.push({
      from_position: tree.position_in_row,
      to_position: tree.position_in_row,
      tree_count: 1,
      verified_trees_count: tree.location_verified ? 1 : 0,
      unverified_trees_count: tree.location_verified ? 0 : 1,
    });
  }

  return ranges;
}

export function groupVarietyLocationTrees(trees: VarietyLocationTree[]) {
  const grouped = new Map<string, VarietyLocationTree[]>();

  for (const tree of [...trees].sort(sortVarietyLocationTrees)) {
    const sectionKey = tree.section_name ?? "";
    const groupKey = `${tree.plot_id}::${sectionKey}::${tree.row_number}`;
    const treesForGroup = grouped.get(groupKey) ?? [];
    treesForGroup.push(tree);
    grouped.set(groupKey, treesForGroup);
  }

  const groups: VarietyLocationGroup[] = [];

  for (const treesForGroup of grouped.values()) {
    const firstTree = treesForGroup[0];

    if (!firstTree) {
      continue;
    }

    const ranges = buildVarietyLocationRanges(treesForGroup);
    const verifiedTreesCount = treesForGroup.filter(
      (tree) => tree.location_verified,
    ).length;

    groups.push({
      plot_id: firstTree.plot_id,
      plot_name: firstTree.plot_name,
      plot_status: firstTree.plot_status,
      section_name: firstTree.section_name ?? null,
      row_number: firstTree.row_number,
      tree_count: treesForGroup.length,
      verified_trees_count: verifiedTreesCount,
      unverified_trees_count: treesForGroup.length - verifiedTreesCount,
      ranges,
    });
  }

  return groups.sort((left, right) => {
    const plotDiff = left.plot_name.localeCompare(right.plot_name);

    if (plotDiff !== 0) {
      return plotDiff;
    }

    const sectionDiff = compareNullableText(left.section_name, right.section_name);

    if (sectionDiff !== 0) {
      return sectionDiff;
    }

    return left.row_number - right.row_number;
  });
}

export function formatVarietyLocationRangeLabel(range: VarietyLocationRange) {
  if (range.from_position === range.to_position) {
    return `Pozycja ${range.from_position}`;
  }

  return `Pozycje ${range.from_position}-${range.to_position}`;
}

