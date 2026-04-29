"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  getPlotLayoutTypeLabel,
  getRowNumberingSchemeLabel,
  getTreeNumberingSchemeLabel,
  PLOT_LAYOUT_TYPES,
  ROW_NUMBERING_SCHEMES,
  TREE_NUMBERING_SCHEMES,
} from "@/lib/domain/plots";
import type { ActionResult, PlotSummary } from "@/types/contracts";

type PlotFormAction = (
  previousState: ActionResult<PlotSummary>,
  formData: FormData,
) => Promise<ActionResult<PlotSummary>>;

type PlotFormProps = {
  action: PlotFormAction;
  mode: "create" | "edit";
  plot?: PlotSummary;
  suggestedCode?: string;
};

const initialPlotFormState: ActionResult<PlotSummary> = {
  success: false,
};

export function PlotForm({ action, mode, plot, suggestedCode }: PlotFormProps) {
  const [state, formAction] = useActionState(action, initialPlotFormState);

  return (
    <form action={formAction} className="grid gap-5">
      {mode === "edit" && plot ? (
        <input name="plot_id" type="hidden" value={plot.id} />
      ) : null}
      <div className="grid gap-4 rounded-2xl border border-[#e7dcc6] bg-[#faf6ed] p-4">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[#304335]">Podstawy dzialki</p>
          <p className="text-sm text-[#5b6155]">
            Nazwa, status i podstawowe informacje terenowe widoczne potem na listach.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={state.field_errors?.name} htmlFor="name" label="Nazwa dzialki">
            <Input
              defaultValue={plot?.name ?? ""}
              id="name"
              name="name"
              placeholder="np. Kwatera Polnocna"
            />
          </Field>
          <Field
            error={state.field_errors?.code}
            hint={
              suggestedCode && mode === "create"
                ? `Proponowany kolejny kod: ${suggestedCode}`
                : "Opcjonalny skrot widoczny na listach."
            }
            htmlFor="code"
            label="Kod"
          >
            <Input
              defaultValue={plot?.code ?? suggestedCode ?? ""}
              id="code"
              name="code"
              placeholder="np. DZ-01"
            />
          </Field>
          <Field error={state.field_errors?.status} htmlFor="status" label="Status">
            <Select defaultValue={plot?.status ?? "active"} id="status" name="status">
              <option value="active">Aktywna</option>
              <option value="planned">Planowana</option>
              <option value="archived">Zarchiwizowana</option>
            </Select>
          </Field>
          <Field
            error={state.field_errors?.location_name}
            htmlFor="location_name"
            label="Opis lokalizacji"
          >
            <Input
              defaultValue={plot?.location_name ?? ""}
              id="location_name"
              name="location_name"
              placeholder="np. Po polnocnej stronie przy drodze"
            />
          </Field>
          <Field
            error={state.field_errors?.area_m2}
            htmlFor="area_m2"
            hint="Opcjonalna powierzchnia w metrach kwadratowych."
            label="Powierzchnia (m2)"
          >
            <Input
              defaultValue={plot?.area_m2 ?? ""}
              id="area_m2"
              min="0"
              name="area_m2"
              step="0.01"
              type="number"
            />
          </Field>
          <Field
            error={state.field_errors?.soil_type}
            htmlFor="soil_type"
            label="Typ gleby"
          >
            <Input
              defaultValue={plot?.soil_type ?? ""}
              id="soil_type"
              name="soil_type"
              placeholder="np. glina pylasta"
            />
          </Field>
          <Field
            error={state.field_errors?.irrigation_type}
            htmlFor="irrigation_type"
            label="Typ nawadniania"
          >
            <Input
              defaultValue={plot?.irrigation_type ?? ""}
              id="irrigation_type"
              name="irrigation_type"
              placeholder="np. linia kroplujaca"
            />
          </Field>
          <Field
            className="sm:col-span-2"
            error={state.field_errors?.description}
            htmlFor="description"
            label="Opis"
          >
            <Textarea
              defaultValue={plot?.description ?? ""}
              id="description"
              name="description"
              placeholder="Opcjonalne notatki o tej dzialce."
            />
          </Field>
        </div>
      </div>
      <div className="grid gap-4 rounded-2xl border border-[#e7dcc6] bg-white p-4">
        <div className="grid gap-1">
          <p className="text-sm font-semibold text-[#304335]">Uklad i numeracja</p>
          <p className="text-sm text-[#5b6155]">
            Te ustawienia porzadkuja rzedy i pozycje drzew dla raportow terenowych.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            error={state.field_errors?.layout_type}
            htmlFor="layout_type"
            hint="Typ ukladu dzialki pomaga interpretowac lokalizacje drzew."
            label="Typ ukladu"
          >
            <Select
              defaultValue={plot?.layout_type ?? "rows"}
              id="layout_type"
              name="layout_type"
            >
              {PLOT_LAYOUT_TYPES.map((layoutType) => (
                <option key={layoutType} value={layoutType}>
                  {getPlotLayoutTypeLabel(layoutType)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.entrance_description}
            htmlFor="entrance_description"
            hint="Np. wjazd od strony zachodniej albo wejscie od drogi glownej."
            label="Punkt odniesienia"
          >
            <Input
              defaultValue={plot?.entrance_description ?? ""}
              id="entrance_description"
              name="entrance_description"
              placeholder="np. Wjazd od strony zachodniej"
            />
          </Field>
          <Field
            error={state.field_errors?.row_numbering_scheme}
            htmlFor="row_numbering_scheme"
            hint="Opcjonalne. Przydaje sie, gdy rzad ma stala orientacje."
            label="Numeracja rzedow"
          >
            <Select
              defaultValue={plot?.row_numbering_scheme ?? ""}
              id="row_numbering_scheme"
              name="row_numbering_scheme"
            >
              <option value="">Brak ustalonego schematu</option>
              {ROW_NUMBERING_SCHEMES.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {getRowNumberingSchemeLabel(scheme)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.tree_numbering_scheme}
            htmlFor="tree_numbering_scheme"
            hint="Opcjonalne. Okresla, skad liczyc pozycje drzewa w rzedzie."
            label="Numeracja drzew w rzedzie"
          >
            <Select
              defaultValue={plot?.tree_numbering_scheme ?? ""}
              id="tree_numbering_scheme"
              name="tree_numbering_scheme"
            >
              <option value="">Brak ustalonego schematu</option>
              {TREE_NUMBERING_SCHEMES.map((scheme) => (
                <option key={scheme} value={scheme}>
                  {getTreeNumberingSchemeLabel(scheme)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.default_row_count}
            htmlFor="default_row_count"
            hint="Opcjonalna orientacyjna liczba rzedow."
            label="Domyslna liczba rzedow"
          >
            <Input
              defaultValue={plot?.default_row_count ?? ""}
              id="default_row_count"
              min="1"
              name="default_row_count"
              step="1"
              type="number"
            />
          </Field>
          <Field
            error={state.field_errors?.default_trees_per_row}
            htmlFor="default_trees_per_row"
            hint="Opcjonalna typowa liczba drzew w jednym rzedzie."
            label="Domyslna liczba drzew w rzedzie"
          >
            <Input
              defaultValue={plot?.default_trees_per_row ?? ""}
              id="default_trees_per_row"
              min="1"
              name="default_trees_per_row"
              step="1"
              type="number"
            />
          </Field>
          <Field
            className="sm:col-span-2"
            error={state.field_errors?.layout_notes}
            htmlFor="layout_notes"
            label="Notatki o ukladzie"
          >
            <Textarea
              defaultValue={plot?.layout_notes ?? ""}
              id="layout_notes"
              name="layout_notes"
              placeholder="Np. rzedy numerowane od lewej do prawej patrzac od wjazdu."
            />
          </Field>
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Tworzenie dzialki..." : "Zapisywanie dzialki..."}>
          {mode === "create" ? "Utworz dzialke" : "Zapisz dzialke"}
        </SubmitButton>
        <LinkButton href="/plots" variant="secondary">
          Wroc do dzialek
        </LinkButton>
      </div>
    </form>
  );
}
