import type {
  TreeInventoryExceptionType,
  TreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
import type { TreeConditionStatus } from "@/types/contracts";

export type TreeInventoryE2eSegmentRow = {
  segment_key: string;
  section_name?: string | null;
  row_number: number;
  from_position: number;
  to_position: number;
  species: string;
  variety_id?: string | null;
  variety_name?: string | null;
  variety_confidence: TreeInventoryVarietyConfidence;
  condition_status: TreeConditionStatus;
  rootstock?: string | null;
  location_verified?: boolean | null;
  notes?: string | null;
};

export type TreeInventoryE2eExceptionRow = {
  exception_key: string;
  segment_key: string;
  section_name?: string | null;
  row_number: number;
  position_in_row: number;
  exception_type: TreeInventoryExceptionType;
  species?: string | null;
  variety_id?: string | null;
  variety_name?: string | null;
  variety_confidence?: TreeInventoryVarietyConfidence | null;
  condition_status?: TreeConditionStatus | null;
  notes?: string | null;
};

export type TreeInventoryE2eWorkbookFixture = {
  segments: TreeInventoryE2eSegmentRow[];
  exceptions: TreeInventoryE2eExceptionRow[];
};

export type TreeInventoryFullCycleFixture = {
  candidateAName: string;
  candidateBName: string;
  workbook: TreeInventoryE2eWorkbookFixture;
  expected: {
    preview: {
      totalPositions: number;
      plannedRecords: number;
      missingPositions: number;
      activeConflicts: number;
      newCandidatePositions: number;
      unknownVarietyPositions: number;
      groupedCandidates: number;
      unresolvedCandidates: number;
      diagnostics: number;
    };
    confirm: {
      createdTrees: number;
      createdVarieties: number;
      unknownVarietyTrees: number;
      missingPositions: number;
    };
    treeList: {
      rangeText: string;
      visibleTexts: string[];
      hiddenTexts: string[];
    };
    plotVisual: {
      activeMarkers: number;
      emptyMarkers: number;
    };
    varietyReports: Array<{
      varietyName: string;
      activeTrees: number;
      locatedTrees: number;
      groupRow: number;
      ranges: string[];
      hiddenGroupRows: number[];
    }>;
  };
};

export function buildTreeInventoryFullCycleFixture(
  uniqueSuffix: string,
): TreeInventoryFullCycleFixture {
  const candidateAName = `PW Excel A ${uniqueSuffix}`;
  const candidateBName = `PW Excel B ${uniqueSuffix}`;

  return {
    candidateAName,
    candidateBName,
    workbook: {
      // The downloaded workbook carries orchard_id and plot_id in hidden metadata.
      // These rows intentionally contain only user-entered inventory data.
      segments: [
        {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position: 3,
          species: "Apple",
          variety_id: null,
          variety_name: candidateAName,
          variety_confidence: "new_candidate",
          condition_status: "good",
          rootstock: "M9",
          notes: "Full-cycle fixture segment A.",
        },
        {
          segment_key: "S2",
          row_number: 2,
          from_position: 1,
          to_position: 2,
          species: "Apple",
          variety_id: null,
          variety_name: candidateBName,
          variety_confidence: "new_candidate",
          condition_status: "good",
          rootstock: "M26",
          notes: "Full-cycle fixture segment B.",
        },
        {
          segment_key: "S3",
          row_number: 3,
          from_position: 1,
          to_position: 1,
          species: "Pear",
          variety_id: null,
          variety_name: null,
          variety_confidence: "unknown",
          condition_status: "good",
          notes: "Full-cycle fixture unknown variety.",
        },
      ],
      exceptions: [
        {
          exception_key: "E1",
          segment_key: "S1",
          row_number: 1,
          position_in_row: 2,
          exception_type: "missing_tree",
          variety_confidence: "uncertain",
          notes: "Full-cycle fixture missing position.",
        },
      ],
    },
    expected: {
      preview: {
        totalPositions: 6,
        plannedRecords: 5,
        missingPositions: 1,
        activeConflicts: 0,
        newCandidatePositions: 4,
        unknownVarietyPositions: 1,
        groupedCandidates: 3,
        unresolvedCandidates: 2,
        diagnostics: 0,
      },
      confirm: {
        createdTrees: 5,
        createdVarieties: 2,
        unknownVarietyTrees: 1,
        missingPositions: 1,
      },
      treeList: {
        rangeText: "Pokazano 1-5 z 5 drzew",
        visibleTexts: [
          candidateAName,
          candidateBName,
          "Pear drzewo",
          "Row 1, pos 1",
          "Row 1, pos 3",
          "Row 2, pos 1",
          "Row 2, pos 2",
          "Row 3, pos 1",
        ],
        hiddenTexts: ["Row 1, pos 2"],
      },
      plotVisual: {
        activeMarkers: 5,
        emptyMarkers: 1,
      },
      varietyReports: [
        {
          varietyName: candidateAName,
          activeTrees: 2,
          locatedTrees: 2,
          groupRow: 1,
          ranges: ["Pozycja 1", "Pozycja 3"],
          hiddenGroupRows: [2, 3],
        },
        {
          varietyName: candidateBName,
          activeTrees: 2,
          locatedTrees: 2,
          groupRow: 2,
          ranges: ["Pozycje 1-2"],
          hiddenGroupRows: [1, 3],
        },
      ],
    },
  };
}
