"use client";

import { useActionState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DatalistInput } from "@/components/ui/datalist-input";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { SPECIES_PRESETS } from "@/lib/domain/species";
import type {
  ActionResult,
  PlotOption,
  TreeSummary,
  VarietyOption,
} from "@/types/contracts";

type TreeFormAction = (
  previousState: ActionResult<TreeSummary>,
  formData: FormData,
) => Promise<ActionResult<TreeSummary>>;

type TreeFormProps = {
  action: TreeFormAction;
  mode: "create" | "edit";
  plotOptions: PlotOption[];
  plotHint?: string;
  tree?: TreeSummary;
  varietyOptions: VarietyOption[];
};

const initialTreeFormState: ActionResult<TreeSummary> = {
  success: false,
};

export function TreeForm({
  action,
  mode,
  plotOptions,
  plotHint,
  tree,
  varietyOptions,
}: TreeFormProps) {
  const [state, formAction] = useActionState(action, initialTreeFormState);
  const selectedPlotId =
    tree && plotOptions.some((plot) => plot.id === tree.plot_id) ? tree.plot_id : "";

  return (
    <form action={formAction} className="grid gap-6">
      {mode === "edit" && tree ? (
        <input name="tree_id" type="hidden" value={tree.id} />
      ) : null}

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Podstawowa identyfikacja</CardTitle>
          <CardDescription>
            Najwazniejsze informacje identyfikujace drzewo w strukturze sadu.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.species}
          htmlFor="species"
          hint="Wybierz z listy albo wpisz wlasny gatunek."
          label="Gatunek"
        >
          <DatalistInput
            defaultValue={tree?.species ?? ""}
            id="species"
            listId="tree-species-presets"
            name="species"
            options={SPECIES_PRESETS}
            placeholder="np. apple"
          />
        </Field>
        <Field
          error={state.field_errors?.tree_code}
          htmlFor="tree_code"
          label="Kod drzewa"
        >
          <Input
            defaultValue={tree?.tree_code ?? ""}
            id="tree_code"
            name="tree_code"
            placeholder="Opcjonalny kod terenowy"
          />
        </Field>
        <Field
          error={state.field_errors?.display_name}
          htmlFor="display_name"
          label="Nazwa wyswietlana"
        >
          <Input
            defaultValue={tree?.display_name ?? ""}
            id="display_name"
            name="display_name"
            placeholder="Opcjonalna czytelna nazwa"
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Umiejscowienie w sadzie</CardTitle>
          <CardDescription>
            Polacz drzewo z dzialka oraz opcjonalnie z odmiana i logiczna lokalizacja.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.plot_id}
          hint={plotHint}
          htmlFor="plot_id"
          label="Dzialka"
        >
          <Select defaultValue={selectedPlotId} id="plot_id" name="plot_id">
            <option value="">Wybierz dzialke</option>
            {plotOptions.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          error={state.field_errors?.variety_id}
          htmlFor="variety_id"
          label="Odmiana"
        >
          <Select
            defaultValue={tree?.variety_id ?? ""}
            id="variety_id"
            name="variety_id"
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
          <Field
            error={state.field_errors?.section_name}
            htmlFor="section_name"
            label="Sekcja"
          >
            <Input
              defaultValue={tree?.section_name ?? ""}
              id="section_name"
              name="section_name"
              placeholder="Opcjonalna sekcja lub cwiartka"
            />
          </Field>
          <Field
            error={state.field_errors?.row_number}
            htmlFor="row_number"
            label="Numer rzedu"
          >
            <Input
              defaultValue={tree?.row_number ?? ""}
              id="row_number"
              min="1"
              name="row_number"
              step="1"
              type="number"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.position_in_row}
            htmlFor="position_in_row"
            label="Pozycja w rzedzie"
          >
            <Input
              defaultValue={tree?.position_in_row ?? ""}
              id="position_in_row"
              min="1"
              name="position_in_row"
              step="1"
              type="number"
            />
          </Field>
          <Field
            error={state.field_errors?.row_label}
            htmlFor="row_label"
            label="Etykieta rzedu"
          >
            <Input
              defaultValue={tree?.row_label ?? ""}
              id="row_label"
              name="row_label"
              placeholder="Opcjonalna etykieta niestandardowa"
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.position_label}
          htmlFor="position_label"
          label="Etykieta pozycji"
        >
          <Input
            defaultValue={tree?.position_label ?? ""}
            id="position_label"
            name="position_label"
            placeholder="Opcjonalna etykieta niestandardowa"
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Stan i kondycja</CardTitle>
          <CardDescription>
            Aktualny stan drzewa i dodatkowe informacje o jego cyklu zycia.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.condition_status}
          htmlFor="condition_status"
          label="Status kondycji"
        >
          <Select
            defaultValue={tree?.condition_status ?? "good"}
            id="condition_status"
            name="condition_status"
          >
            <option value="new">Nowe</option>
            <option value="good">Dobre</option>
            <option value="warning">Uwaga</option>
            <option value="critical">Krytyczne</option>
            <option value="removed">Usuniete</option>
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.planted_at}
            htmlFor="planted_at"
            label="Data posadzenia"
          >
            <Input
              defaultValue={tree?.planted_at ?? ""}
              id="planted_at"
              name="planted_at"
              type="date"
            />
          </Field>
          <Field
            error={state.field_errors?.acquired_at}
            htmlFor="acquired_at"
            label="Data pozyskania"
          >
            <Input
              defaultValue={tree?.acquired_at ?? ""}
              id="acquired_at"
              name="acquired_at"
              type="date"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.health_status}
            htmlFor="health_status"
            label="Stan zdrowotny"
          >
            <Input
              defaultValue={tree?.health_status ?? ""}
              id="health_status"
              name="health_status"
              placeholder="Opcjonalnie"
            />
          </Field>
          <Field
            error={state.field_errors?.development_stage}
            htmlFor="development_stage"
            label="Etap rozwoju"
          >
            <Input
              defaultValue={tree?.development_stage ?? ""}
              id="development_stage"
              name="development_stage"
              placeholder="Opcjonalnie"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.rootstock}
            htmlFor="rootstock"
            label="Podkladka"
          >
            <Input
              defaultValue={tree?.rootstock ?? ""}
              id="rootstock"
              name="rootstock"
              placeholder="Opcjonalnie"
            />
          </Field>
          <Field
            error={state.field_errors?.pollinator_info}
            htmlFor="pollinator_info"
            label="Informacje o zapylaczu"
          >
            <Input
              defaultValue={tree?.pollinator_info ?? ""}
              id="pollinator_info"
              name="pollinator_info"
              placeholder="Opcjonalnie"
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.last_harvest_at}
          htmlFor="last_harvest_at"
          label="Data ostatniego zbioru"
        >
          <Input
            defaultValue={tree?.last_harvest_at ?? ""}
            id="last_harvest_at"
            name="last_harvest_at"
            type="date"
          />
        </Field>
        <label className="flex items-start gap-3 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#4f584e]">
          <input
            className="mt-1 h-4 w-4 rounded border-[#c7b997]"
            defaultChecked={tree?.location_verified ?? false}
            id="location_verified"
            name="location_verified"
            type="checkbox"
          />
          <span>Oznacz lokalizacje jako potwierdzona w terenie.</span>
        </label>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Dodatkowe notatki</CardTitle>
          <CardDescription>
            Swobodne notatki, ktore nie pasuja jeszcze do bardziej ustrukturyzowanych pol.
          </CardDescription>
        </div>
        <Field error={state.field_errors?.notes} htmlFor="notes" label="Notatki">
          <Textarea
            defaultValue={tree?.notes ?? ""}
            id="notes"
            name="notes"
            placeholder="Opcjonalne notatki o drzewie."
          />
        </Field>
      </Card>

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Tworzenie drzewa..." : "Zapisywanie drzewa..."}>
          {mode === "create" ? "Utworz drzewo" : "Zapisz drzewo"}
        </SubmitButton>
        <LinkButton href="/trees" variant="secondary">
          Wroc do drzew
        </LinkButton>
      </div>
    </form>
  );
}
