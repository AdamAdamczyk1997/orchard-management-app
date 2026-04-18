"use client";

import { useActionState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
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
          <CardTitle className="text-lg">Basic identity</CardTitle>
          <CardDescription>
            Core tree identity used across orchard structure, activities, and harvests.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.species}
          htmlFor="species"
          label="Species"
        >
          <Input
            defaultValue={tree?.species ?? ""}
            id="species"
            name="species"
            placeholder="e.g. apple"
          />
        </Field>
        <Field
          error={state.field_errors?.tree_code}
          htmlFor="tree_code"
          label="Tree code"
        >
          <Input
            defaultValue={tree?.tree_code ?? ""}
            id="tree_code"
            name="tree_code"
            placeholder="Optional field code"
          />
        </Field>
        <Field
          error={state.field_errors?.display_name}
          htmlFor="display_name"
          label="Display name"
        >
          <Input
            defaultValue={tree?.display_name ?? ""}
            id="display_name"
            name="display_name"
            placeholder="Optional friendly name"
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Orchard placement</CardTitle>
          <CardDescription>
            Link the tree to a plot and optionally to a known variety and logical location.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.plot_id}
          hint={plotHint}
          htmlFor="plot_id"
          label="Plot"
        >
          <Select defaultValue={selectedPlotId} id="plot_id" name="plot_id">
            <option value="">Choose plot</option>
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
          label="Variety"
        >
          <Select
            defaultValue={tree?.variety_id ?? ""}
            id="variety_id"
            name="variety_id"
          >
            <option value="">No variety assigned</option>
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
            label="Section"
          >
            <Input
              defaultValue={tree?.section_name ?? ""}
              id="section_name"
              name="section_name"
              placeholder="Optional section or quarter"
            />
          </Field>
          <Field
            error={state.field_errors?.row_number}
            htmlFor="row_number"
            label="Row number"
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
            label="Position in row"
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
            label="Row label"
          >
            <Input
              defaultValue={tree?.row_label ?? ""}
              id="row_label"
              name="row_label"
              placeholder="Optional custom label"
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.position_label}
          htmlFor="position_label"
          label="Position label"
        >
          <Input
            defaultValue={tree?.position_label ?? ""}
            id="position_label"
            name="position_label"
            placeholder="Optional custom label"
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Health and status</CardTitle>
          <CardDescription>
            Current condition and optional lifecycle details for this tree.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.condition_status}
          htmlFor="condition_status"
          label="Condition status"
        >
          <Select
            defaultValue={tree?.condition_status ?? "good"}
            id="condition_status"
            name="condition_status"
          >
            <option value="new">New</option>
            <option value="good">Good</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="removed">Removed</option>
          </Select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.planted_at}
            htmlFor="planted_at"
            label="Planted at"
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
            label="Acquired at"
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
            label="Health status"
          >
            <Input
              defaultValue={tree?.health_status ?? ""}
              id="health_status"
              name="health_status"
              placeholder="Optional"
            />
          </Field>
          <Field
            error={state.field_errors?.development_stage}
            htmlFor="development_stage"
            label="Development stage"
          >
            <Input
              defaultValue={tree?.development_stage ?? ""}
              id="development_stage"
              name="development_stage"
              placeholder="Optional"
            />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            error={state.field_errors?.rootstock}
            htmlFor="rootstock"
            label="Rootstock"
          >
            <Input
              defaultValue={tree?.rootstock ?? ""}
              id="rootstock"
              name="rootstock"
              placeholder="Optional"
            />
          </Field>
          <Field
            error={state.field_errors?.pollinator_info}
            htmlFor="pollinator_info"
            label="Pollinator info"
          >
            <Input
              defaultValue={tree?.pollinator_info ?? ""}
              id="pollinator_info"
              name="pollinator_info"
              placeholder="Optional"
            />
          </Field>
        </div>
        <Field
          error={state.field_errors?.last_harvest_at}
          htmlFor="last_harvest_at"
          label="Last harvest at"
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
          <span>Mark the location as verified in the field.</span>
        </label>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Optional notes</CardTitle>
          <CardDescription>
            Free-form notes that do not fit better into the structured fields yet.
          </CardDescription>
        </div>
        <Field error={state.field_errors?.notes} htmlFor="notes" label="Notes">
          <Textarea
            defaultValue={tree?.notes ?? ""}
            id="notes"
            name="notes"
            placeholder="Optional tree notes."
          />
        </Field>
      </Card>

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Creating tree..." : "Saving tree..."}>
          {mode === "create" ? "Create tree" : "Save tree"}
        </SubmitButton>
        <LinkButton href="/trees" variant="secondary">
          Back to trees
        </LinkButton>
      </div>
    </form>
  );
}
