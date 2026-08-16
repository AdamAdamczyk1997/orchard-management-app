"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  TREE_INVENTORY_UPLOAD_PREVIEW_DIAGNOSTIC_RENDER_LIMIT,
  type TreeInventoryUploadPreviewConflict,
  type TreeInventoryUploadPreviewData,
  type TreeInventoryUploadPreviewVarietyCandidate,
} from "@/lib/tree-inventory-import/upload-preview-contract";
import type {
  ActionResult,
  OrchardMembershipRole,
  PlotOption,
  VarietyOption,
} from "@/types/contracts";

type TreeInventoryImportFormAction = (
  previousState: ActionResult<TreeInventoryUploadPreviewData>,
  formData: FormData,
) => Promise<ActionResult<TreeInventoryUploadPreviewData>>;

type TreeInventoryImportFormProps = {
  action: TreeInventoryImportFormAction;
  canResolveVarietyCandidates: boolean;
  plotOptions: PlotOption[];
  role: OrchardMembershipRole;
  varietyOptions: VarietyOption[];
};

type TreeInventoryImportFormDispatch = (payload: FormData) => void;

const initialState: ActionResult<TreeInventoryUploadPreviewData> = {
  success: false,
};

const statusLabels: Record<TreeInventoryUploadPreviewData["status"], string> = {
  failed: "Blad importu",
  validated: "Wymaga poprawek",
  awaiting_variety_resolution: "Wymaga odmian",
  ready_for_owner_confirm: "Gotowy do confirm",
  confirmed: "Confirmed",
};

export function TreeInventoryImportForm({
  action,
  canResolveVarietyCandidates,
  plotOptions,
  role,
  varietyOptions,
}: TreeInventoryImportFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedPlotId, setSelectedPlotId] = useState(plotOptions[0]?.id ?? "");
  const selectedPlot = plotOptions.find((plot) => plot.id === selectedPlotId);
  const templateHref = selectedPlotId
    ? `/trees/import/template?plot_id=${encodeURIComponent(selectedPlotId)}`
    : "";
  const preview = state.data;

  return (
    <div className="grid gap-6" data-testid="tree-inventory-import-form">
      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Szablon XLSX</CardTitle>
          <CardDescription>
            Szablon jest generowany dla aktywnego sadu i jednej dzialki rzedowej.
          </CardDescription>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field htmlFor="template_plot_id" label="Dzialka">
            <Select
              data-testid="tree-inventory-template-plot-select"
              id="template_plot_id"
              onChange={(event) => setSelectedPlotId(event.target.value)}
              value={selectedPlotId}
            >
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                </option>
              ))}
            </Select>
          </Field>
          {templateHref ? (
            <a
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#21452d] px-4 py-2 text-sm font-semibold text-[#fff9f0] shadow-sm transition hover:bg-[#193622] focus:outline-none focus:ring-2 focus:ring-[#b48446] focus:ring-offset-2 focus:ring-offset-[#fbfaf7] sm:w-auto"
              data-testid="tree-inventory-template-download"
              download
              href={templateHref}
            >
              Pobierz template
            </a>
          ) : (
            <Button
              className="w-full sm:w-auto"
              data-testid="tree-inventory-template-download"
              disabled
              type="button"
            >
              Pobierz template
            </Button>
          )}
        </div>
        {selectedPlot ? (
          <p className="text-sm text-[#5b6155]">
            Wybrana dzialka:{" "}
            <span className="font-medium text-[#304335]">{selectedPlot.name}</span>
          </p>
        ) : null}
      </Card>

      <form action={formAction} className="grid gap-5">
        <Card className="grid gap-5">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Upload workbooka</CardTitle>
            <CardDescription>
              Backend sprawdzi format pliku, sparsuje XLSX i zapisze staging preview.
            </CardDescription>
          </div>
          <Field
            error={state.field_errors?.workbook}
            hint="Dozwolony jest plik .xlsx do 5 MB."
            htmlFor="workbook"
            label="Workbook XLSX"
          >
            <Input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              data-testid="tree-inventory-upload-input"
              id="workbook"
              name="workbook"
              type="file"
            />
          </Field>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SubmitButton
              className="w-full sm:w-auto"
              pendingLabel="Sprawdzanie..."
            >
              Wgraj i pokaz preview
            </SubmitButton>
            <span
              className="text-sm text-[#6d7269]"
              data-testid="tree-inventory-upload-submit"
            >
              {state.success ? "Preview gotowy" : "Oczekuje na workbook"}
            </span>
          </div>
          <FormMessage state={state} />
        </Card>
      </form>

      {preview ? (
        <PreviewPanel
          canResolveVarietyCandidates={canResolveVarietyCandidates}
          formAction={formAction}
          preview={preview}
          role={role}
          varietyOptions={varietyOptions}
        />
      ) : null}
    </div>
  );
}

function PreviewPanel({
  canResolveVarietyCandidates,
  formAction,
  preview,
  role,
  varietyOptions,
}: {
  canResolveVarietyCandidates: boolean;
  formAction: TreeInventoryImportFormDispatch;
  preview: TreeInventoryUploadPreviewData;
  role: OrchardMembershipRole;
  varietyOptions: VarietyOption[];
}) {
  const diagnostics = useMemo(
    () =>
      preview.diagnostics.slice(
        0,
        TREE_INVENTORY_UPLOAD_PREVIEW_DIAGNOSTIC_RENDER_LIMIT,
      ),
    [preview.diagnostics],
  );
  const hiddenDiagnosticsCount = Math.max(
    0,
    preview.diagnostics.length - diagnostics.length,
  );

  return (
    <div className="grid gap-6" data-testid="tree-inventory-preview">
      <Card className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Preview importu</CardTitle>
            <CardDescription>
              Status: {statusLabels[preview.status]} · Import ID:{" "}
              {preview.import_id ?? "nie zapisano"}
            </CardDescription>
          </div>
          <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-sm font-medium text-[#355139]">
            {preview.summary.planned_tree_records} planned trees
          </span>
        </div>
        <SummaryGrid preview={preview} />
      </Card>

      <VarietyCandidatesPanel
        canResolveVarietyCandidates={canResolveVarietyCandidates}
        candidates={preview.candidates}
        confirmVersion={preview.confirm_version}
        formAction={formAction}
        importId={preview.import_id}
        varietyOptions={varietyOptions}
      />
      <ConflictsPanel conflicts={preview.conflicts} />

      <ConfirmPanel formAction={formAction} preview={preview} role={role} />

      <Card className="grid gap-4" data-testid="tree-inventory-diagnostics">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Diagnostics</CardTitle>
          <CardDescription>
            Errors: {preview.summary.diagnostics.errors} · Warnings:{" "}
            {preview.summary.diagnostics.warnings} · Info:{" "}
            {preview.summary.diagnostics.info}
          </CardDescription>
        </div>
        {diagnostics.length > 0 ? (
          <div className="grid gap-3">
            {diagnostics.map((diagnostic, index) => (
              <div
                className="grid gap-2 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm"
                id={diagnosticAnchorId(diagnostic)}
                key={`${diagnostic.code}:${index}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={severityClassName(diagnostic.severity)}>
                    {diagnostic.severity}
                  </span>
                  <span className="font-medium text-[#304335]">
                    {diagnostic.code}
                  </span>
                  <span className="text-[#6d7269]">
                    {formatDiagnosticSource(diagnostic)}
                  </span>
                </div>
                <p className="text-[#4f584e]">{diagnostic.message}</p>
              </div>
            ))}
            {hiddenDiagnosticsCount > 0 ? (
              <p className="text-sm text-[#6d7269]">
                Ukryto {hiddenDiagnosticsCount} diagnostics po limicie renderowania.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#5b6155]">Brak diagnostics dla preview.</p>
        )}
      </Card>
    </div>
  );
}

function ConfirmPanel({
  formAction,
  preview,
  role,
}: {
  formAction: TreeInventoryImportFormDispatch;
  preview: TreeInventoryUploadPreviewData;
  role: OrchardMembershipRole;
}) {
  return (
    <Card className="grid gap-4" data-testid="tree-inventory-confirm-panel">
      <div className="grid gap-1">
        <CardTitle className="text-lg">Confirm</CardTitle>
        <CardDescription>{buildConfirmMessage(preview, role)}</CardDescription>
      </div>

      {preview.confirm_result ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="tree-inventory-confirm-report"
        >
          {[
            {
              key: "created-trees",
              label: "Created trees",
              value: preview.confirm_result.created_trees_count,
            },
            {
              key: "new-varieties",
              label: "New varieties",
              value: preview.confirm_result.created_varieties_count,
            },
            {
              key: "unknown-variety",
              label: "Unknown variety",
              value: preview.confirm_result.unknown_variety_trees_count,
            },
            {
              key: "missing-positions",
              label: "Missing positions",
              value: preview.confirm_result.missing_positions_count,
            },
          ].map((item) => (
            <div
              className="rounded-2xl border border-[#b9d2be] bg-[#edf6ef] px-4 py-3"
              data-testid={`tree-inventory-confirm-${item.key}`}
              key={item.key}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#54795a]">
                {item.label}
              </p>
              <p className="text-2xl font-semibold text-[#1f2a1f]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <form action={formAction}>
        <input name="intent" type="hidden" value="confirm_import" />
        <input name="import_id" type="hidden" value={preview.import_id ?? ""} />
        <input
          name="confirm_token"
          type="hidden"
          value={preview.confirm_token ?? ""}
        />
        {preview.confirm_version ? (
          <input
            name="confirm_version"
            type="hidden"
            value={String(preview.confirm_version)}
          />
        ) : null}
        <Button
          className="w-full sm:w-auto"
          data-testid="tree-inventory-confirm-button"
          disabled={!preview.can_confirm}
          type="submit"
        >
          Confirm import
        </Button>
      </form>
    </Card>
  );
}

function SummaryGrid({
  preview,
}: {
  preview: TreeInventoryUploadPreviewData;
}) {
  const summary = preview.summary;
  const items = [
    { key: "total-positions", label: "Total positions", value: summary.total_positions },
    {
      key: "planned-records",
      label: "Planned records",
      value: summary.planned_tree_records,
    },
    {
      key: "missing-positions",
      label: "Missing positions",
      value: summary.missing_positions,
    },
    {
      key: "active-conflicts",
      label: "Active conflicts",
      value: summary.active_conflicts,
    },
    {
      key: "known-varieties",
      label: "Known varieties",
      value: summary.known_variety_positions,
    },
    {
      key: "new-candidates",
      label: "New candidates",
      value: summary.new_candidate_positions,
    },
    { key: "uncertain", label: "Uncertain", value: summary.uncertain_variety_positions },
    { key: "unknown", label: "Unknown", value: summary.unknown_variety_positions },
    {
      key: "grouped-candidates",
      label: "Grouped candidates",
      value: summary.grouped_variety_candidates,
    },
    {
      key: "unresolved",
      label: "Unresolved",
      value: summary.unresolved_variety_candidates,
    },
    { key: "suggested", label: "Suggested", value: summary.suggested_variety_candidates },
    { key: "diagnostics", label: "Diagnostics", value: summary.diagnostics.returned },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          className="rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3"
          data-testid={`tree-inventory-summary-${item.key}`}
          key={item.key}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d7e4e]">
            {item.label}
          </p>
          <p className="text-2xl font-semibold text-[#1f2a1f]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function VarietyCandidatesPanel({
  canResolveVarietyCandidates,
  candidates,
  confirmVersion,
  formAction,
  importId,
  varietyOptions,
}: {
  canResolveVarietyCandidates: boolean;
  candidates: TreeInventoryUploadPreviewVarietyCandidate[];
  confirmVersion: number | null;
  formAction: TreeInventoryImportFormDispatch;
  importId: string | null;
  varietyOptions: VarietyOption[];
}) {
  const unresolvedCandidates = candidates.filter((candidate) =>
    candidate.resolution_status === "unresolved" ||
    candidate.resolution_status === "suggested",
  );

  return (
    <Card className="grid gap-4" data-testid="tree-inventory-variety-candidates">
      <div className="grid gap-1">
        <CardTitle className="text-lg">Variety candidates</CardTitle>
        <CardDescription>
          Unresolved groups: {unresolvedCandidates.length} · All groups:{" "}
          {candidates.length}
        </CardDescription>
      </div>
      {candidates.length > 0 ? (
        <div className="grid gap-3">
          {candidates.map((candidate) => (
            <CandidateRow
              canResolveVarietyCandidates={canResolveVarietyCandidates}
              candidate={candidate}
              confirmVersion={confirmVersion}
              formAction={formAction}
              importId={importId}
              key={candidate.id}
              varietyOptions={varietyOptions}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#5b6155]">Brak kandydatow odmian.</p>
      )}
    </Card>
  );
}

function CandidateRow({
  canResolveVarietyCandidates,
  candidate,
  confirmVersion,
  formAction,
  importId,
  varietyOptions,
}: {
  canResolveVarietyCandidates: boolean;
  candidate: TreeInventoryUploadPreviewVarietyCandidate;
  confirmVersion: number | null;
  formAction: TreeInventoryImportFormDispatch;
  importId: string | null;
  varietyOptions: VarietyOption[];
}) {
  const canResolve =
    canResolveVarietyCandidates &&
    Boolean(importId) &&
    (candidate.resolution_status === "unresolved" ||
      candidate.resolution_status === "suggested");
  const matchingVarieties = varietyOptions.filter(
    (variety) =>
      normalizeCandidateLookup(variety.species) ===
      normalizeCandidateLookup(candidate.species),
  );
  const defaultVarietyId =
    candidate.suggested_variety_id ??
    matchingVarieties[0]?.id ??
    "";
  const canUseExisting = canResolve && matchingVarieties.length > 0;
  const canCreateNew =
    canResolve &&
    candidate.source_status !== "unknown" &&
    Boolean(candidate.raw_name?.trim());
  const canKeepUnknown = canResolve && candidate.source_status !== "known";

  return (
    <div
      className="grid gap-3 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm"
      data-testid="tree-inventory-variety-candidate"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[#304335]">
            {candidate.species} · {candidate.raw_name ?? "unknown variety"}
          </p>
          <p className="text-[#6d7269]">
            {candidate.source_status} · {candidate.resolution_status}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-medium text-[#355139]">
          {candidate.positions_count} planned trees
        </span>
      </div>
      {candidate.source_rows.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {candidate.source_rows.map((sourceRow) => (
            <a
              className="rounded-full border border-[#dfd3bb] bg-white px-3 py-1 text-xs font-medium text-[#274430]"
              href={`#source-${sourceRow.sheet_name}-${sourceRow.source_row_number}`}
              key={sourceRow.id}
            >
              {sourceRow.sheet_name} row {sourceRow.source_row_number}
            </a>
          ))}
        </div>
      ) : null}
      {canResolve ? (
        <div
          className="grid gap-3 border-t border-[#dfd3bb] pt-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto]"
          data-testid="tree-inventory-variety-resolution-controls"
        >
          <form action={formAction} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <ResolutionHiddenFields
              candidateId={candidate.id}
              confirmVersion={confirmVersion}
              importId={importId}
              resolutionAction="use_existing"
            />
            <Select
              aria-label="Existing variety"
              data-testid="tree-inventory-resolve-variety-select"
              defaultValue={defaultVarietyId}
              disabled={!canUseExisting}
              name="variety_id"
            >
              {matchingVarieties.length > 0 ? (
                matchingVarieties.map((variety) => (
                  <option key={variety.id} value={variety.id}>
                    {variety.species} · {variety.name}
                  </option>
                ))
              ) : (
                <option value="">Brak odmian dla species</option>
              )}
            </Select>
            <Button
              className="w-full sm:w-auto"
              data-testid="tree-inventory-resolve-use-existing"
              disabled={!canUseExisting}
              type="submit"
            >
              Use existing
            </Button>
          </form>

          <form action={formAction}>
            <ResolutionHiddenFields
              candidateId={candidate.id}
              confirmVersion={confirmVersion}
              importId={importId}
              resolutionAction="create_new"
            />
            <Button
              className="w-full"
              data-testid="tree-inventory-resolve-create-new"
              disabled={!canCreateNew}
              type="submit"
              variant="secondary"
            >
              Create at confirm
            </Button>
          </form>

          <form action={formAction}>
            <ResolutionHiddenFields
              candidateId={candidate.id}
              confirmVersion={confirmVersion}
              importId={importId}
              resolutionAction="keep_unknown"
            />
            <Button
              className="w-full"
              data-testid="tree-inventory-resolve-keep-unknown"
              disabled={!canKeepUnknown}
              type="submit"
              variant="ghost"
            >
              Keep unknown
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-xs font-medium text-[#6d7269]">
          Resolution action: {candidate.resolution_action ?? "none"}
        </p>
      )}
    </div>
  );
}

function ResolutionHiddenFields({
  candidateId,
  confirmVersion,
  importId,
  resolutionAction,
}: {
  candidateId: string;
  confirmVersion: number | null;
  importId: string | null;
  resolutionAction: "use_existing" | "create_new" | "keep_unknown";
}) {
  return (
    <>
      <input name="intent" type="hidden" value="resolve_variety_candidate" />
      <input name="import_id" type="hidden" value={importId ?? ""} />
      <input name="candidate_id" type="hidden" value={candidateId} />
      <input name="resolution_action" type="hidden" value={resolutionAction} />
      {confirmVersion ? (
        <input
          name="confirm_version"
          type="hidden"
          value={String(confirmVersion)}
        />
      ) : null}
    </>
  );
}

function ConflictsPanel({
  conflicts,
}: {
  conflicts: TreeInventoryUploadPreviewConflict[];
}) {
  return (
    <Card className="grid gap-4" data-testid="tree-inventory-conflicts">
      <div className="grid gap-1">
        <CardTitle className="text-lg">Conflicts</CardTitle>
        <CardDescription>Active tree conflicts: {conflicts.length}</CardDescription>
      </div>
      {conflicts.length > 0 ? (
        <div className="grid gap-3">
          {conflicts.map((conflict) => (
            <div
              className="grid gap-2 rounded-2xl border border-[#ebc4bb] bg-[#fff4f1] px-4 py-3 text-sm"
              key={conflict.id}
            >
              <p className="font-medium text-[#823225]">
                Row {conflict.row_number ?? "-"}, position{" "}
                {conflict.position_in_row ?? "-"}
              </p>
              <p className="text-[#6d584f]">
                Existing tree: {conflict.existing_tree_id ?? "unknown"} · Species:{" "}
                {conflict.species ?? "unknown"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#5b6155]">Brak aktywnych konfliktow.</p>
      )}
    </Card>
  );
}

function buildConfirmMessage(
  preview: TreeInventoryUploadPreviewData,
  role: OrchardMembershipRole,
) {
  if (preview.status === "confirmed") {
    return "Import confirmed. Final report is persisted in staging audit.";
  }

  if (!preview.can_confirm && role !== "owner") {
    return "Worker moze przygotowac preview, ale nie moze confirmowac importu.";
  }

  if (preview.summary.unresolved_variety_candidates > 0) {
    return "Owner musi najpierw rozstrzygnac blocking candidate groups.";
  }

  if (preview.can_confirm) {
    return "Owner moze zatwierdzic import. Confirm ponownie sprawdzi DB state.";
  }

  return "Confirm bedzie dostepny, gdy preview bedzie gotowy i bez blocking diagnostics.";
}

function normalizeCandidateLookup(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("pl") ?? "";
}

function formatDiagnosticSource(
  diagnostic: TreeInventoryUploadPreviewData["diagnostics"][number],
) {
  const source = diagnostic.source;

  if (!source) {
    return "workbook";
  }

  const parts = [
    source.sheet,
    source.row_number ? `row ${source.row_number}` : null,
    source.column ? `column ${source.column}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "workbook";
}

function diagnosticAnchorId(
  diagnostic: TreeInventoryUploadPreviewData["diagnostics"][number],
) {
  const source = diagnostic.source;

  if (!source?.sheet || !source.row_number) {
    return undefined;
  }

  return `source-${source.sheet}-${source.row_number}`;
}

function severityClassName(
  severity: TreeInventoryUploadPreviewData["diagnostics"][number]["severity"],
) {
  if (severity === "error") {
    return "rounded-full bg-[#f7d8d0] px-2 py-0.5 text-xs font-semibold text-[#823225]";
  }

  if (severity === "warning") {
    return "rounded-full bg-[#f8e9c7] px-2 py-0.5 text-xs font-semibold text-[#70521c]";
  }

  return "rounded-full bg-[#e7efe4] px-2 py-0.5 text-xs font-semibold text-[#355139]";
}
