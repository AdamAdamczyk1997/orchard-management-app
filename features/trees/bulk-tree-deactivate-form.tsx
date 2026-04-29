"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatPlotDefaultGridLabel,
  getPlotLayoutTypeLabel,
  getPlotRowRangeWorkflowGuidance,
  getRowNumberingSchemeLabel,
  getTreeNumberingSchemeLabel,
  supportsRowRangeWorkflows,
  type PlotTreeWorkflowOption,
} from "@/lib/domain/plots";
import type {
  ActionResult,
  BulkDeactivateTreesPreviewResult,
} from "@/types/contracts";

type BulkDeactivateTreesFormAction = (
  previousState: ActionResult<BulkDeactivateTreesPreviewResult>,
  formData: FormData,
) => Promise<ActionResult<BulkDeactivateTreesPreviewResult>>;

type BulkTreeDeactivateFormProps = {
  action: BulkDeactivateTreesFormAction;
  plotOptions: PlotTreeWorkflowOption[];
};

const initialState: ActionResult<BulkDeactivateTreesPreviewResult> = {
  success: false,
};

export function BulkTreeDeactivateForm({
  action,
  plotOptions,
}: BulkTreeDeactivateFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [rowNumber, setRowNumber] = useState("");
  const [fromPosition, setFromPosition] = useState("");
  const [toPosition, setToPosition] = useState("");
  const [reason, setReason] = useState("");
  const preview = state.data;
  const selectedPlot = plotOptions.find((plot) => plot.id === selectedPlotId);
  const supportsSelectedPlot =
    !selectedPlot || supportsRowRangeWorkflows(selectedPlot.layout_type);
  const hasReadyPreview = Boolean(preview && preview.matched_trees.length > 0);

  return (
    <form
      action={formAction}
      className="grid gap-6"
      data-testid="bulk-tree-deactivate-form"
    >
      {hasReadyPreview ? <input name="confirm_preview" type="hidden" value="true" /> : null}
      <input name="plot_id" type="hidden" value={selectedPlotId} />

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Zakres drzew do wycofania</CardTitle>
          <CardDescription>
            Operacja masowo oznaczy drzewa jako `removed` i ustawi je jako nieaktywne.
            Najpierw generujesz podglad, potem osobno potwierdzasz zapis.
          </CardDescription>
        </div>
        <Field error={state.field_errors?.plot_id} htmlFor="plot_id" label="Dzialka">
          <Select
            id="plot_id"
            onChange={(event) => setSelectedPlotId(event.target.value)}
            value={selectedPlotId}
          >
            <option value="">Wybierz dzialke</option>
            {plotOptions.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.name}
              </option>
            ))}
          </Select>
        </Field>
        {selectedPlot ? (
          <div
            className="grid gap-3 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-4 text-sm text-[#4f584e]"
            data-testid="bulk-tree-deactivate-plot-guidance"
          >
            <div className="grid gap-1">
              <p className="font-medium text-[#304335]">
                Uklad dzialki: {getPlotLayoutTypeLabel(selectedPlot.layout_type)}
              </p>
              <p>{getPlotRowRangeWorkflowGuidance(selectedPlot.layout_type)}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-medium text-[#304335]">Numeracja rzedow:</span>{" "}
                {selectedPlot.row_numbering_scheme
                  ? getRowNumberingSchemeLabel(selectedPlot.row_numbering_scheme)
                  : "Brak"}
              </p>
              <p>
                <span className="font-medium text-[#304335]">Numeracja drzew:</span>{" "}
                {selectedPlot.tree_numbering_scheme
                  ? getTreeNumberingSchemeLabel(selectedPlot.tree_numbering_scheme)
                  : "Brak"}
              </p>
              <p>
                <span className="font-medium text-[#304335]">Planowana siatka:</span>{" "}
                {formatPlotDefaultGridLabel(selectedPlot)}
              </p>
              <p>
                <span className="font-medium text-[#304335]">Punkt odniesienia:</span>{" "}
                {selectedPlot.entrance_description ?? "Brak"}
              </p>
            </div>
            {selectedPlot.layout_notes ? (
              <p>{selectedPlot.layout_notes}</p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field error={state.field_errors?.row_number} htmlFor="row_number" label="Numer rzedu">
            <Input
              id="row_number"
              min="1"
              name="row_number"
              onChange={(event) => setRowNumber(event.target.value)}
              step="1"
              type="number"
              value={rowNumber}
            />
          </Field>
          <Field
            error={state.field_errors?.from_position}
            htmlFor="from_position"
            label="Od pozycji"
          >
            <Input
              id="from_position"
              min="1"
              name="from_position"
              onChange={(event) => setFromPosition(event.target.value)}
              step="1"
              type="number"
              value={fromPosition}
            />
          </Field>
          <Field
            error={state.field_errors?.to_position}
            htmlFor="to_position"
            label="Do pozycji"
          >
            <Input
              id="to_position"
              min="1"
              name="to_position"
              onChange={(event) => setToPosition(event.target.value)}
              step="1"
              type="number"
              value={toPosition}
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.reason}
          hint="Opcjonalny powod zostanie dopisany do notatek wycofywanych drzew."
          htmlFor="reason"
          label="Powod wycofania"
        >
          <Textarea
            id="reason"
            name="reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Np. wymiana nasadzen, bledna ewidencja, usuniecie po chorobie."
            value={reason}
          />
        </Field>
      </Card>

      {preview ? (
        <Card className="grid gap-5" data-testid="bulk-tree-deactivate-preview">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Podglad deaktywacji</CardTitle>
            <CardDescription>
              {preview.plot_name} · rzad {preview.row_number} · pozycje {preview.from_position}-
              {preview.to_position}
            </CardDescription>
          </div>
          <div className="grid gap-2 text-sm text-[#4f584e] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Zakres pozycji:</span>{" "}
              {preview.requested_positions_count}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Aktywne drzewa do zmiany:</span>{" "}
              {preview.matched_trees.length}
            </p>
          </div>

          {preview.warnings.length > 0 ? (
            <div className="grid gap-2">
              {preview.warnings.map((warning) => (
                <div
                  className="rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#5b6155]"
                  key={warning}
                >
                  {warning}
                </div>
              ))}
            </div>
          ) : null}

          {preview.matched_trees.length > 0 ? (
            <div className="grid gap-3">
              {preview.matched_trees.map((tree) => (
                <div
                  className="rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#4f584e]"
                  key={tree.tree_id}
                >
                  <p className="font-medium text-[#304335]">
                    {tree.location_label}
                    {tree.display_name ? ` · ${tree.display_name}` : ""}
                  </p>
                  <p>
                    {tree.tree_code ? `Kod ${tree.tree_code} · ` : ""}
                    status {tree.condition_status}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <Button
          data-testid="bulk-tree-deactivate-preview-button"
          disabled={!supportsSelectedPlot}
          name="intent"
          type="submit"
          value="preview"
          variant="secondary"
        >
          Sprawdz podglad
        </Button>
        {hasReadyPreview ? (
          <Button
            data-testid="bulk-tree-deactivate-confirm-button"
            disabled={!supportsSelectedPlot}
            name="intent"
            type="submit"
            value="create"
            variant="danger"
          >
            Potwierdz wycofanie drzew
          </Button>
        ) : null}
        <LinkButton href="/trees" variant="ghost">
          Wroc do drzew
        </LinkButton>
      </div>
    </form>
  );
}
