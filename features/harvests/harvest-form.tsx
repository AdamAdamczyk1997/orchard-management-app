"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  HARVEST_QUANTITY_UNITS,
  HARVEST_SCOPE_LEVELS,
  getHarvestScopeLabel,
} from "@/lib/domain/harvests";
import type {
  ActionResult,
  HarvestActivityOption,
  HarvestQuantityUnit,
  HarvestRecordDetails,
  HarvestRecordFormInput,
  PlotOption,
  TreeOption,
  VarietyOption,
} from "@/types/contracts";

type HarvestFormAction = (
  previousState: ActionResult<HarvestRecordDetails>,
  formData: FormData,
) => Promise<ActionResult<HarvestRecordDetails>>;

type HarvestFormProps = {
  action: HarvestFormAction;
  mode: "create" | "edit";
  harvestRecord?: HarvestRecordDetails;
  plotOptions: PlotOption[];
  varietyOptions: VarietyOption[];
  treeOptions: TreeOption[];
  harvestActivityOptions: HarvestActivityOption[];
};

const initialHarvestFormState: ActionResult<HarvestRecordDetails> = {
  success: false,
};

function formatVarietyLabel(variety: VarietyOption) {
  return `${variety.species} - ${variety.name}`;
}

export function HarvestForm({
  action,
  mode,
  harvestRecord,
  plotOptions,
  varietyOptions,
  treeOptions,
  harvestActivityOptions,
}: HarvestFormProps) {
  const [state, formAction] = useActionState(action, initialHarvestFormState);
  const [scopeLevel, setScopeLevel] = useState<HarvestRecordFormInput["scope_level"]>(
    harvestRecord?.scope_level ?? "plot",
  );
  const [selectedPlotId, setSelectedPlotId] = useState(harvestRecord?.plot_id ?? "");
  const [selectedTreeId, setSelectedTreeId] = useState(harvestRecord?.tree_id ?? "");
  const [quantityUnit, setQuantityUnit] = useState<HarvestQuantityUnit>(
    harvestRecord?.quantity_unit ?? "kg",
  );

  const filteredTreeOptions = useMemo(() => {
    if (!selectedPlotId) {
      return treeOptions;
    }

    return treeOptions.filter((tree) => tree.plot_id === selectedPlotId);
  }, [selectedPlotId, treeOptions]);

  useEffect(() => {
    if (
      selectedTreeId &&
      !filteredTreeOptions.some((tree) => tree.id === selectedTreeId)
    ) {
      setSelectedTreeId("");
    }
  }, [filteredTreeOptions, selectedTreeId]);

  return (
    <form action={formAction} className="grid gap-6">
      {mode === "edit" && harvestRecord ? (
        <input
          name="harvest_record_id"
          type="hidden"
          value={harvestRecord.id}
        />
      ) : null}

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Podstawy wpisu</CardTitle>
          <CardDescription>
            Zapisz dzien zbioru, poziom szczegolowosci i ilosc w jednostce zrodlowej.
          </CardDescription>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            error={state.field_errors?.scope_level}
            htmlFor="scope_level"
            label="Poziom szczegolowosci"
          >
            <Select
              id="scope_level"
              name="scope_level"
              onChange={(event) =>
                setScopeLevel(
                  event.target.value as HarvestRecordFormInput["scope_level"],
                )
              }
              value={scopeLevel}
            >
              {HARVEST_SCOPE_LEVELS.map((value) => (
                <option key={value} value={value}>
                  {getHarvestScopeLabel(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.harvest_date}
            hint="Rok sezonu wylicza sie automatycznie z daty."
            htmlFor="harvest_date"
            label="Data zbioru"
          >
            <Input
              defaultValue={
                harvestRecord?.harvest_date ?? new Date().toISOString().slice(0, 10)
              }
              id="harvest_date"
              name="harvest_date"
              type="date"
            />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
          <Field
            error={state.field_errors?.quantity_value}
            htmlFor="quantity_value"
            label="Ilosc"
          >
            <Input
              defaultValue={harvestRecord?.quantity_value ?? ""}
              id="quantity_value"
              inputMode="decimal"
              min="0.001"
              name="quantity_value"
              placeholder="np. 125"
              step="0.001"
              type="number"
            />
          </Field>
          <Field
            error={state.field_errors?.quantity_unit}
            htmlFor="quantity_unit"
            label="Jednostka"
          >
            <Select
              id="quantity_unit"
              name="quantity_unit"
              onChange={(event) =>
                setQuantityUnit(event.target.value as HarvestQuantityUnit)
              }
              value={quantityUnit}
            >
              {HARVEST_QUANTITY_UNITS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Kontekst zbioru</CardTitle>
          <CardDescription>
            Powiaz dzialke, odmiane, drzewo lub aktywnosc tylko wtedy, gdy realnie
            doprecyzowuja wpis.
          </CardDescription>
        </div>

        {scopeLevel !== "orchard" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              error={state.field_errors?.plot_id}
              htmlFor="plot_id"
              label="Dzialka"
            >
              <Select
                id="plot_id"
                name="plot_id"
                onChange={(event) => setSelectedPlotId(event.target.value)}
                value={selectedPlotId}
              >
                <option value="">Bez przypisanej dzialki</option>
                {plotOptions.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.name}
                    {plot.status === "archived" ? " (zarchiwizowana)" : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {scopeLevel === "variety" || scopeLevel === "location_range" ? (
              <Field
                error={state.field_errors?.variety_id}
                htmlFor="variety_id"
                label="Odmiana"
              >
                <Select
                  defaultValue={harvestRecord?.variety_id ?? ""}
                  id="variety_id"
                  name="variety_id"
                >
                  <option value="">Bez przypisanej odmiany</option>
                  {varietyOptions.map((variety) => (
                    <option key={variety.id} value={variety.id}>
                      {formatVarietyLabel(variety)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        ) : null}

        {scopeLevel === "tree" ? (
          <Field
            error={state.field_errors?.tree_id}
            hint="Jesli najpierw wybierzesz dzialke, lista drzew zawęzi sie automatycznie."
            htmlFor="tree_id"
            label="Drzewo"
          >
            <Select
              id="tree_id"
              name="tree_id"
              onChange={(event) => {
                const nextTreeId = event.target.value;
                const selectedTree = treeOptions.find((tree) => tree.id === nextTreeId);

                setSelectedTreeId(nextTreeId);

                if (selectedTree && selectedTree.plot_id !== selectedPlotId) {
                  setSelectedPlotId(selectedTree.plot_id);
                }
              }}
              value={selectedTreeId}
            >
              <option value="">Wybierz drzewo</option>
              {filteredTreeOptions.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.label}
                  {tree.is_active ? "" : " (nieaktywne)"}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {scopeLevel === "location_range" ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field
              error={state.field_errors?.section_name}
              htmlFor="section_name"
              label="Sekcja"
            >
              <Input
                defaultValue={harvestRecord?.section_name ?? ""}
                id="section_name"
                name="section_name"
                placeholder="np. Poludnie"
              />
            </Field>
            <Field
              error={state.field_errors?.row_number}
              htmlFor="row_number"
              label="Rzad"
            >
              <Input
                defaultValue={harvestRecord?.row_number ?? ""}
                id="row_number"
                inputMode="numeric"
                min="1"
                name="row_number"
                step="1"
                type="number"
              />
            </Field>
            <Field
              error={state.field_errors?.from_position}
              htmlFor="from_position"
              label="Od pozycji"
            >
              <Input
                defaultValue={harvestRecord?.from_position ?? ""}
                id="from_position"
                inputMode="numeric"
                min="1"
                name="from_position"
                step="1"
                type="number"
              />
            </Field>
            <Field
              error={state.field_errors?.to_position}
              htmlFor="to_position"
              label="Do pozycji"
            >
              <Input
                defaultValue={harvestRecord?.to_position ?? ""}
                id="to_position"
                inputMode="numeric"
                min="1"
                name="to_position"
                step="1"
                type="number"
              />
            </Field>
          </div>
        ) : null}

        <Field
          error={state.field_errors?.activity_id}
          hint="Opcjonalne powiazanie z aktywnoscia typu harvest z tego samego sadu."
          htmlFor="activity_id"
          label="Powiazana aktywnosc"
        >
          <Select
            defaultValue={harvestRecord?.activity_id ?? ""}
            id="activity_id"
            name="activity_id"
          >
            <option value="">Bez powiazanej aktywnosci</option>
            {harvestActivityOptions.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field error={state.field_errors?.notes} htmlFor="notes" label="Notatki">
          <Textarea
            defaultValue={harvestRecord?.notes ?? ""}
            id="notes"
            name="notes"
            placeholder="Dodatkowe informacje o zbiorze, jakosci lub warunkach."
            rows={5}
          />
        </Field>
      </Card>

      <FormMessage state={state} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Zapisywanie wpisu...">
          {mode === "create" ? "Zapisz wpis zbioru" : "Zapisz zmiany"}
        </SubmitButton>
        <LinkButton href="/harvests" variant="secondary">
          Wroc do zbiorow
        </LinkButton>
        {mode === "edit" && harvestRecord ? (
          <LinkButton href={`/harvests/${harvestRecord.id}`} variant="ghost">
            Szczegoly wpisu
          </LinkButton>
        ) : null}
      </div>

      <div className="rounded-2xl border border-dashed border-[#dfd3bb] px-4 py-4 text-sm leading-6 text-[#6d7269]">
        W tym kroku skupiamy sie na stabilnym CRUD dla wpisow zbioru. Harvestowe
        podsumowanie sezonu dojdzie jako osobny reportingowy slice.
      </div>
    </form>
  );
}
