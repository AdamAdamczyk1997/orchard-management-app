"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DatalistInput } from "@/components/ui/datalist-input";
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
import { SPECIES_PRESETS } from "@/lib/domain/species";
import type {
  ActionResult,
  BulkTreeBatchPreviewResult,
  VarietyOption,
} from "@/types/contracts";

type BulkTreeBatchFormAction = (
  previousState: ActionResult<BulkTreeBatchPreviewResult>,
  formData: FormData,
) => Promise<ActionResult<BulkTreeBatchPreviewResult>>;

type BulkTreeBatchFormProps = {
  action: BulkTreeBatchFormAction;
  plotOptions: PlotTreeWorkflowOption[];
  varietyOptions: VarietyOption[];
};

const initialState: ActionResult<BulkTreeBatchPreviewResult> = {
  success: false,
};

export function BulkTreeBatchForm({
  action,
  plotOptions,
  varietyOptions,
}: BulkTreeBatchFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [varietyId, setVarietyId] = useState("");
  const [species, setSpecies] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [rowNumber, setRowNumber] = useState("");
  const [fromPosition, setFromPosition] = useState("");
  const [toPosition, setToPosition] = useState("");
  const [treeCodePattern, setTreeCodePattern] = useState("");
  const [defaultConditionStatus, setDefaultConditionStatus] = useState("new");
  const [defaultPlantedAt, setDefaultPlantedAt] = useState("");
  const [defaultRootstock, setDefaultRootstock] = useState("");
  const [defaultNotes, setDefaultNotes] = useState("");
  const preview = state.data;
  const selectedPlot = plotOptions.find((plot) => plot.id === selectedPlotId);
  const supportsSelectedPlot =
    !selectedPlot || supportsRowRangeWorkflows(selectedPlot.layout_type);
  const hasReadyPreview = Boolean(preview && preview.conflicts.length === 0);

  return (
    <form
      action={formAction}
      className="grid gap-6"
      data-testid="bulk-tree-batch-form"
    >
      {hasReadyPreview ? <input name="confirm_preview" type="hidden" value="true" /> : null}
      <input name="plot_id" type="hidden" value={selectedPlotId} />
      <input name="variety_id" type="hidden" value={varietyId} />
      <input
        name="default_condition_status"
        type="hidden"
        value={defaultConditionStatus}
      />

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Zakres nowej partii drzew</CardTitle>
          <CardDescription>
            Dodaj wiele drzew jednego rzedu w formule all-or-nothing. System najpierw
            sprawdzi konflikt lokalizacji, a dopiero potem pozwoli zapisac batch.
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
            data-testid="bulk-tree-batch-plot-guidance"
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
        <Field
          error={state.field_errors?.species}
          hint="Mozesz wybrac gatunek z listy albo wpisac wlasny."
          htmlFor="species"
          label="Gatunek"
        >
          <DatalistInput
            id="species"
            listId="bulk-tree-species-presets"
            name="species"
            onChange={(event) => setSpecies(event.target.value)}
            options={SPECIES_PRESETS}
            placeholder="np. apple"
            value={species}
          />
        </Field>
        <Field error={state.field_errors?.variety_id} htmlFor="variety_id" label="Odmiana">
          <Select
            id="variety_id"
            onChange={(event) => setVarietyId(event.target.value)}
            value={varietyId}
          >
            <option value="">Bez przypisanej odmiany</option>
            {varietyOptions.map((variety) => (
              <option key={variety.id} value={variety.id}>
                {variety.species} - {variety.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={state.field_errors?.section_name} htmlFor="section_name" label="Sekcja">
            <Input
              id="section_name"
              name="section_name"
              onChange={(event) => setSectionName(event.target.value)}
              placeholder="Opcjonalna sekcja"
              value={sectionName}
            />
          </Field>
          <Field
            error={state.field_errors?.row_number}
            htmlFor="row_number"
            label="Numer rzedu"
          >
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
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
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
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Wspolne dane dla nowych drzew</CardTitle>
          <CardDescription>
            Te wartosci zostana skopiowane do kazdego rekordu w tworzonym zakresie.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.generated_tree_code_pattern}
          hint="Jesli wpiszesz wzorzec, uzyj placeholdera {{n}}, np. MAIN-R3-T{{n}}."
          htmlFor="generated_tree_code_pattern"
          label="Wzorzec kodu drzewa"
        >
          <Input
            id="generated_tree_code_pattern"
            name="generated_tree_code_pattern"
            onChange={(event) => setTreeCodePattern(event.target.value)}
            placeholder="Opcjonalnie, np. MAIN-R3-T{{n}}"
            value={treeCodePattern}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.default_condition_status}
            htmlFor="default_condition_status"
            label="Domyslny status kondycji"
          >
            <Select
              id="default_condition_status"
              onChange={(event) => setDefaultConditionStatus(event.target.value)}
              value={defaultConditionStatus}
            >
              <option value="new">Nowe</option>
              <option value="good">Dobre</option>
              <option value="warning">Uwaga</option>
              <option value="critical">Krytyczne</option>
            </Select>
          </Field>
          <Field
            error={state.field_errors?.default_planted_at}
            htmlFor="default_planted_at"
            label="Data posadzenia"
          >
            <Input
              id="default_planted_at"
              name="default_planted_at"
              onChange={(event) => setDefaultPlantedAt(event.target.value)}
              type="date"
              value={defaultPlantedAt}
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.default_rootstock}
          htmlFor="default_rootstock"
          label="Domyslna podkladka"
        >
          <Input
            id="default_rootstock"
            name="default_rootstock"
            onChange={(event) => setDefaultRootstock(event.target.value)}
            placeholder="Opcjonalnie"
            value={defaultRootstock}
          />
        </Field>
        <Field error={state.field_errors?.default_notes} htmlFor="default_notes" label="Wspolne notatki">
          <Textarea
            id="default_notes"
            name="default_notes"
            onChange={(event) => setDefaultNotes(event.target.value)}
            placeholder="Opcjonalna notatka skopiowana do calej partii drzew."
            value={defaultNotes}
          />
        </Field>
      </Card>

      {preview ? (
        <Card className="grid gap-5" data-testid="bulk-tree-batch-preview">
          <div className="grid gap-1">
            <CardTitle className="text-lg">
              {preview.conflicts.length > 0 ? "Konflikty w zakresie" : "Podglad batcha"}
            </CardTitle>
            <CardDescription>
              {preview.plot_name} · rzad {preview.row_number} · pozycje {preview.from_position}-
              {preview.to_position}
            </CardDescription>
          </div>
          <div className="grid gap-2 text-sm text-[#4f584e] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Planowanych pozycji:</span>{" "}
              {preview.requested_positions_count}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Konflikty aktywnych drzew:</span>{" "}
              {preview.conflicts.length}
            </p>
          </div>

          {preview.conflicts.length > 0 ? (
            <div className="grid gap-3">
              {preview.conflicts.map((conflict) => (
                <div
                  className="rounded-2xl border border-[#ebc4bb] bg-[#fff4f1] px-4 py-3 text-sm text-[#823225]"
                  key={conflict.tree_id}
                >
                  <p className="font-medium">
                    {conflict.location_label}
                    {conflict.display_name ? ` · ${conflict.display_name}` : ""}
                  </p>
                  <p>
                    {conflict.tree_code ? `Kod ${conflict.tree_code} · ` : ""}
                    status {conflict.condition_status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="text-sm text-[#4f584e]">
                Zakres jest wolny. Poniżej widzisz planowane rekordy dla tego batcha.
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {preview.planned_trees.map((tree) => (
                  <div
                    className="rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#4f584e]"
                    key={tree.position_in_row}
                  >
                    <p className="font-medium text-[#304335]">{tree.location_label}</p>
                    <p>{tree.tree_code ? `Kod: ${tree.tree_code}` : "Bez generowanego kodu"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <Button
          data-testid="bulk-tree-batch-preview-button"
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
            data-testid="bulk-tree-batch-confirm-button"
            disabled={!supportsSelectedPlot}
            name="intent"
            type="submit"
            value="create"
          >
            Utworz zakres drzew
          </Button>
        ) : null}
        <LinkButton href="/trees" variant="ghost">
          Wroc do drzew
        </LinkButton>
      </div>
    </form>
  );
}
