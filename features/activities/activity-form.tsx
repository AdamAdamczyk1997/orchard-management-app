"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_SCOPE_LEVELS,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  activityTypeRequiresScope,
  deriveSeasonPhaseFromDate,
  getActivityPruningSubtypeLabel,
  getActivityScopeLevelLabel,
  getActivityStatusLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import {
  formatPlotDefaultGridLabel,
  getPlotLayoutTypeLabel,
  getPlotOperationalLocationGuidance,
  getRowNumberingSchemeLabel,
  getTreeNumberingSchemeLabel,
  supportsActivityScopeLevelForPlotLayout,
} from "@/lib/domain/plots";
import type {
  ActionResult,
  ActiveMemberOption,
  ActivityDetails,
  ActivityFormInput,
  ActivityMaterialInput,
  ActivityScopeInput,
  PlotOption,
  TreeOption,
} from "@/types/contracts";

type ActivityFormAction = (
  previousState: ActionResult<ActivityDetails>,
  formData: FormData,
) => Promise<ActionResult<ActivityDetails>>;

type ActivityFormProps = {
  action: ActivityFormAction;
  mode: "create" | "edit";
  activity?: ActivityDetails;
  plotOptions: PlotOption[];
  treeOptions: TreeOption[];
  memberOptions: ActiveMemberOption[];
  defaultPerformedBy?: string;
  defaultPerformedByProfileId?: string;
};

const initialActivityFormState: ActionResult<ActivityDetails> = {
  success: false,
};

function parseIntegerInput(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function parseDecimalInput(value: string) {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEmptyScope(): ActivityScopeInput {
  return {
    scope_level: "plot",
  };
}

function createEmptyMaterial(): ActivityMaterialInput {
  return {
    name: "",
  };
}

function buildInitialScopes(activity?: ActivityDetails): ActivityScopeInput[] {
  if (!activity) {
    return [];
  }

  return activity.scopes.map((scope) => ({
    scope_order: scope.scope_order ?? undefined,
    scope_level: scope.scope_level,
    section_name: scope.section_name ?? undefined,
    row_number: scope.row_number ?? undefined,
    from_position: scope.from_position ?? undefined,
    to_position: scope.to_position ?? undefined,
    tree_id: scope.tree_id ?? undefined,
    notes: scope.notes ?? undefined,
  }));
}

function buildInitialMaterials(activity?: ActivityDetails): ActivityMaterialInput[] {
  if (!activity) {
    return [];
  }

  return activity.materials.map((material) => ({
    name: material.name,
    category: material.category ?? undefined,
    quantity: material.quantity ?? undefined,
    unit: material.unit ?? undefined,
    notes: material.notes ?? undefined,
  }));
}

function normalizeScopeForLevel(
  scopeLevel: ActivityScopeInput["scope_level"],
  currentScope: ActivityScopeInput,
): ActivityScopeInput {
  const baseScope = {
    scope_order: currentScope.scope_order,
    scope_level: scopeLevel,
    notes: currentScope.notes,
  } satisfies ActivityScopeInput;

  if (scopeLevel === "section") {
    return {
      ...baseScope,
      section_name: currentScope.section_name,
    };
  }

  if (scopeLevel === "row") {
    return {
      ...baseScope,
      row_number: currentScope.row_number,
    };
  }

  if (scopeLevel === "location_range") {
    return {
      ...baseScope,
      row_number: currentScope.row_number,
      from_position: currentScope.from_position,
      to_position: currentScope.to_position,
    };
  }

  if (scopeLevel === "tree") {
    return {
      ...baseScope,
      tree_id: currentScope.tree_id,
    };
  }

  return baseScope;
}

export function ActivityForm({
  action,
  mode,
  activity,
  plotOptions,
  treeOptions,
  memberOptions,
  defaultPerformedBy,
  defaultPerformedByProfileId,
}: ActivityFormProps) {
  const [state, formAction] = useActionState(action, initialActivityFormState);
  const [activityType, setActivityType] = useState<ActivityFormInput["activity_type"]>(
    activity?.activity_type ?? "other",
  );
  const [activitySubtype, setActivitySubtype] = useState(
    activity?.activity_subtype ?? "",
  );
  const [selectedPlotId, setSelectedPlotId] = useState(activity?.plot_id ?? "");
  const [selectedTreeId, setSelectedTreeId] = useState(activity?.tree_id ?? "");
  const [activityDate, setActivityDate] = useState(
    activity?.activity_date ?? new Date().toISOString().slice(0, 10),
  );
  const [seasonPhase, setSeasonPhase] = useState(
    activity?.season_phase ?? deriveSeasonPhaseFromDate(activityDate),
  );
  const [seasonPhaseEdited, setSeasonPhaseEdited] = useState(Boolean(activity?.season_phase));
  const [scopes, setScopes] = useState<ActivityScopeInput[]>(buildInitialScopes(activity));
  const [materials, setMaterials] = useState<ActivityMaterialInput[]>(
    buildInitialMaterials(activity),
  );
  const selectedPlot = plotOptions.find((plot) => plot.id === selectedPlotId);

  const selectedPlotTreeOptions = selectedPlotId
    ? treeOptions.filter((tree) => tree.plot_id === selectedPlotId)
    : [];
  const scopesRequired = activityTypeRequiresScope(activityType);
  const activityTypeIsSpraying = activityType === "spraying";
  const hasUnsupportedScopeSelection = Boolean(
    selectedPlot &&
      scopes.some(
        (scope) =>
          !supportsActivityScopeLevelForPlotLayout(
            selectedPlot.layout_type,
            scope.scope_level,
          ),
      ),
  );

  useEffect(() => {
    if (!seasonPhaseEdited) {
      setSeasonPhase(deriveSeasonPhaseFromDate(activityDate));
    }
  }, [activityDate, seasonPhaseEdited]);

  useEffect(() => {
    if (scopesRequired && scopes.length === 0) {
      setScopes([createEmptyScope()]);
    }
  }, [scopesRequired, scopes.length]);

  useEffect(() => {
    if (activityTypeIsSpraying && materials.length === 0) {
      setMaterials([createEmptyMaterial()]);
    }
  }, [activityTypeIsSpraying, materials.length]);

  useEffect(() => {
    const matchingTreeOptions = selectedPlotId
      ? treeOptions.filter((tree) => tree.plot_id === selectedPlotId)
      : [];

    if (!selectedPlotId) {
      if (selectedTreeId) {
        setSelectedTreeId("");
      }

      setScopes((currentScopes) =>
        currentScopes.map((scope) =>
          scope.tree_id
            ? {
                ...scope,
                tree_id: undefined,
              }
            : scope,
        ),
      );

      return;
    }

    if (
      selectedTreeId &&
      !matchingTreeOptions.some((tree) => tree.id === selectedTreeId)
    ) {
      setSelectedTreeId("");
    }

    setScopes((currentScopes) =>
      currentScopes.map((scope) => {
        if (
          scope.tree_id &&
          !matchingTreeOptions.some((tree) => tree.id === scope.tree_id)
        ) {
          return {
            ...scope,
            tree_id: undefined,
          };
        }

        return scope;
      }),
    );
  }, [selectedPlotId, selectedTreeId, treeOptions]);

  return (
    <form action={formAction} className="grid gap-6" data-testid="activity-form">
      {mode === "edit" && activity ? (
        <input name="activity_id" type="hidden" value={activity.id} />
      ) : null}

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Podstawy wpisu</CardTitle>
          <CardDescription>
            Wybierz kontekst pracy, typ aktywnosci i podstawowy opis wpisu.
          </CardDescription>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field error={state.field_errors?.plot_id} htmlFor="plot_id" label="Dzialka">
            <Select
              id="plot_id"
              name="plot_id"
              onChange={(event) => setSelectedPlotId(event.target.value)}
              value={selectedPlotId}
            >
              <option value="">Wybierz dzialke</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                  {plot.status === "archived" ? " (zarchiwizowana)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.tree_id}
            hint="Uzyj tylko dla szybkich wpisow dotyczacych jednego drzewa."
            htmlFor="tree_id"
            label="Drzewo glowne"
          >
            <Select
              id="tree_id"
              name="tree_id"
              onChange={(event) => setSelectedTreeId(event.target.value)}
              value={selectedTreeId}
            >
              <option value="">Bez jednego drzewa glownego</option>
              {selectedPlotTreeOptions.map((tree) => (
                <option key={tree.id} value={tree.id}>
                  {tree.label}
                  {tree.is_active ? "" : " (nieaktywne)"}
                </option>
              ))}
            </Select>
          </Field>
          {selectedPlot ? (
            <div
              className="rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-4 text-sm text-[#4f584e] md:col-span-2"
              data-testid="activity-plot-guidance"
            >
              <div className="grid gap-1">
                <p className="font-medium text-[#304335]">
                  Uklad dzialki: {getPlotLayoutTypeLabel(selectedPlot.layout_type)}
                </p>
                <p>{getPlotOperationalLocationGuidance(selectedPlot.layout_type)}</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
              {selectedPlot.layout_notes ? <p className="mt-3">{selectedPlot.layout_notes}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            error={state.field_errors?.activity_type}
            htmlFor="activity_type"
            label="Typ aktywnosci"
          >
            <Select
              id="activity_type"
              name="activity_type"
              onChange={(event) =>
                setActivityType(event.target.value as ActivityFormInput["activity_type"])
              }
              value={activityType}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getActivityTypeLabel(type)}
                </option>
              ))}
            </Select>
          </Field>
          {activityType === "pruning" ? (
            <Field
              error={state.field_errors?.activity_subtype}
              htmlFor="activity_subtype"
              label="Podtyp ciecia"
            >
              <Select
                id="activity_subtype"
                name="activity_subtype"
                onChange={(event) => setActivitySubtype(event.target.value)}
                value={activitySubtype}
              >
                <option value="">Wybierz podtyp</option>
                <option value="winter_pruning">
                  {getActivityPruningSubtypeLabel("winter_pruning")}
                </option>
                <option value="summer_pruning">
                  {getActivityPruningSubtypeLabel("summer_pruning")}
                </option>
              </Select>
            </Field>
          ) : (
            <input name="activity_subtype" type="hidden" value="" />
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field
            error={state.field_errors?.activity_date}
            htmlFor="activity_date"
            label="Data"
          >
            <Input
              id="activity_date"
              name="activity_date"
              onChange={(event) => setActivityDate(event.target.value)}
              type="date"
              value={activityDate}
            />
          </Field>
          <Field error={state.field_errors?.status} htmlFor="status" label="Status">
            <Select defaultValue={activity?.status ?? "done"} id="status" name="status">
              {ACTIVITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getActivityStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.season_phase}
            hint="Domyslnie podpowiadana z daty, ale mozesz ja zmienic."
            htmlFor="season_phase"
            label="Faza sezonu"
          >
            <Input
              id="season_phase"
              name="season_phase"
              onChange={(event) => {
                setSeasonPhaseEdited(true);
                setSeasonPhase(event.target.value);
              }}
              placeholder="np. wiosna"
              value={seasonPhase}
            />
          </Field>
        </div>
        <Field error={state.field_errors?.title} htmlFor="title" label="Tytul wpisu">
          <Input
            defaultValue={activity?.title ?? ""}
            id="title"
            name="title"
            placeholder="np. Oprysk zapobiegawczy po deszczach"
          />
        </Field>
        <Field
          error={state.field_errors?.description}
          htmlFor="description"
          label="Opis"
        >
          <Textarea
            defaultValue={activity?.description ?? ""}
            id="description"
            name="description"
            placeholder="Dodatkowy kontekst tej aktywnosci."
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Wykonawca i rozliczenie</CardTitle>
          <CardDescription>
            Połącz wpis z wykonawca, czasem pracy i ewentualnym kosztem.
          </CardDescription>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            error={state.field_errors?.performed_by_profile_id}
            htmlFor="performed_by_profile_id"
            label="Wykonawca z tego sadu"
          >
            <Select
              defaultValue={
                activity?.performed_by_profile_id ??
                defaultPerformedByProfileId ??
                ""
              }
              id="performed_by_profile_id"
              name="performed_by_profile_id"
            >
              <option value="">Bez przypisanego wykonawcy z konta</option>
              {memberOptions.map((member) => (
                <option key={member.profile_id} value={member.profile_id}>
                  {member.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            error={state.field_errors?.performed_by}
            hint="Opcjonalny opisowy podpis wykonawcy widoczny na liscie."
            htmlFor="performed_by"
            label="Etykieta wykonawcy"
          >
            <Input
              defaultValue={activity?.performed_by_display ?? defaultPerformedBy ?? ""}
              id="performed_by"
              name="performed_by"
              placeholder="np. Adam / zespol terenowy"
            />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            error={state.field_errors?.work_duration_minutes}
            htmlFor="work_duration_minutes"
            label="Czas pracy (min)"
          >
            <Input
              defaultValue={activity?.work_duration_minutes ?? ""}
              id="work_duration_minutes"
              min="0"
              name="work_duration_minutes"
              step="1"
              type="number"
            />
          </Field>
          <Field
            error={state.field_errors?.cost_amount}
            htmlFor="cost_amount"
            label="Koszt"
          >
            <Input
              defaultValue={activity?.cost_amount ?? ""}
              id="cost_amount"
              min="0"
              name="cost_amount"
              step="0.01"
              type="number"
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Zakres wykonania</CardTitle>
          <CardDescription>
            Jedna aktywnosc moze obejmowac cala dzialke albo kilka konkretnych zakresow.
          </CardDescription>
          {state.field_errors?.scopes ? (
            <p className="text-sm text-[#9a3f2b]">{state.field_errors.scopes}</p>
          ) : null}
          {scopesRequired ? (
            <p className="text-sm text-[#6f7469]">
              Dla tego typu aktywnosci potrzebny jest co najmniej jeden zakres.
            </p>
          ) : null}
          {hasUnsupportedScopeSelection ? (
            <div className="rounded-2xl border border-[#d8b675] bg-[#f8f0df] px-4 py-3 text-sm text-[#6d4c1d]">
              Dla dzialki nieregularnej korzystaj z calej dzialki, sekcji albo
              pojedynczych drzew. Zakresy `rzad` i `zakres lokalizacji` nie sa tu wspierane.
            </div>
          ) : null}
        </div>

        <input name="scopes" type="hidden" value={JSON.stringify(scopes)} />

        <div className="grid gap-4" data-testid="activity-scopes">
          {scopes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfd3bb] px-4 py-4 text-sm text-[#5b6155]">
              Nie dodano jeszcze zadnego zakresu. To jest opcjonalne dla zwyklych
              wpisow, ale wymagane m.in. dla ciecia, koszenia i oprysku.
            </div>
          ) : null}

          {scopes.map((scope, index) => (
            <div
              className="grid gap-4 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4"
              data-testid={`activity-scope-${index}`}
              key={`${scope.scope_level}-${index}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-semibold text-[#304335]">
                    Zakres {index + 1}
                  </p>
                  <p className="text-sm text-[#6f7469]">
                    {getActivityScopeLevelLabel(scope.scope_level)}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setScopes((currentScopes) =>
                      currentScopes.filter((_, scopeIndex) => scopeIndex !== index),
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  Usun zakres
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field htmlFor={`scope_level_${index}`} label="Poziom zakresu">
                  <Select
                    id={`scope_level_${index}`}
                    onChange={(event) =>
                      setScopes((currentScopes) =>
                        currentScopes.map((currentScope, scopeIndex) =>
                          scopeIndex === index
                            ? normalizeScopeForLevel(
                                event.target.value as ActivityScopeInput["scope_level"],
                                currentScope,
                              )
                            : currentScope,
                        ),
                      )
                    }
                    value={scope.scope_level}
                  >
                    {ACTIVITY_SCOPE_LEVELS.map((scopeLevel) => (
                      <option
                        disabled={
                          selectedPlot
                            ? !supportsActivityScopeLevelForPlotLayout(
                                selectedPlot.layout_type,
                                scopeLevel,
                              )
                            : false
                        }
                        key={scopeLevel}
                        value={scopeLevel}
                      >
                        {getActivityScopeLevelLabel(scopeLevel)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor={`scope_order_${index}`} label="Kolejnosc">
                  <Input
                    id={`scope_order_${index}`}
                    min="1"
                    onChange={(event) =>
                      setScopes((currentScopes) =>
                        currentScopes.map((currentScope, scopeIndex) =>
                          scopeIndex === index
                            ? {
                                ...currentScope,
                                scope_order: parseIntegerInput(event.target.value),
                              }
                            : currentScope,
                        ),
                      )
                    }
                    step="1"
                    type="number"
                    value={scope.scope_order ?? ""}
                  />
                </Field>
              </div>

              {scope.scope_level === "section" ? (
                <Field htmlFor={`scope_section_name_${index}`} label="Sekcja">
                  <Input
                    id={`scope_section_name_${index}`}
                    onChange={(event) =>
                      setScopes((currentScopes) =>
                        currentScopes.map((currentScope, scopeIndex) =>
                          scopeIndex === index
                            ? {
                                ...currentScope,
                                section_name: event.target.value,
                              }
                            : currentScope,
                        ),
                      )
                    }
                    value={scope.section_name ?? ""}
                  />
                </Field>
              ) : null}

              {scope.scope_level === "row" || scope.scope_level === "location_range" ? (
                <Field htmlFor={`scope_row_number_${index}`} label="Numer rzedu">
                  <Input
                    id={`scope_row_number_${index}`}
                    min="1"
                    onChange={(event) =>
                      setScopes((currentScopes) =>
                        currentScopes.map((currentScope, scopeIndex) =>
                          scopeIndex === index
                            ? {
                                ...currentScope,
                                row_number: parseIntegerInput(event.target.value),
                              }
                            : currentScope,
                        ),
                      )
                    }
                    step="1"
                    type="number"
                    value={scope.row_number ?? ""}
                  />
                </Field>
              ) : null}

              {scope.scope_level === "location_range" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field htmlFor={`scope_from_position_${index}`} label="Od pozycji">
                    <Input
                      id={`scope_from_position_${index}`}
                      min="1"
                      onChange={(event) =>
                        setScopes((currentScopes) =>
                          currentScopes.map((currentScope, scopeIndex) =>
                            scopeIndex === index
                              ? {
                                  ...currentScope,
                                  from_position: parseIntegerInput(event.target.value),
                                }
                              : currentScope,
                          ),
                        )
                      }
                      step="1"
                      type="number"
                      value={scope.from_position ?? ""}
                    />
                  </Field>
                  <Field htmlFor={`scope_to_position_${index}`} label="Do pozycji">
                    <Input
                      id={`scope_to_position_${index}`}
                      min="1"
                      onChange={(event) =>
                        setScopes((currentScopes) =>
                          currentScopes.map((currentScope, scopeIndex) =>
                            scopeIndex === index
                              ? {
                                  ...currentScope,
                                  to_position: parseIntegerInput(event.target.value),
                                }
                              : currentScope,
                          ),
                        )
                      }
                      step="1"
                      type="number"
                      value={scope.to_position ?? ""}
                    />
                  </Field>
                </div>
              ) : null}

              {scope.scope_level === "tree" ? (
                <Field htmlFor={`scope_tree_id_${index}`} label="Drzewo w zakresie">
                  <Select
                    id={`scope_tree_id_${index}`}
                    onChange={(event) =>
                      setScopes((currentScopes) =>
                        currentScopes.map((currentScope, scopeIndex) =>
                          scopeIndex === index
                            ? {
                                ...currentScope,
                                tree_id: event.target.value || undefined,
                              }
                            : currentScope,
                        ),
                      )
                    }
                    value={scope.tree_id ?? ""}
                  >
                    <option value="">Wybierz drzewo</option>
                    {selectedPlotTreeOptions.map((tree) => (
                      <option key={tree.id} value={tree.id}>
                        {tree.label}
                        {tree.is_active ? "" : " (nieaktywne)"}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field htmlFor={`scope_notes_${index}`} label="Notatki do zakresu">
                <Textarea
                  id={`scope_notes_${index}`}
                  onChange={(event) =>
                    setScopes((currentScopes) =>
                      currentScopes.map((currentScope, scopeIndex) =>
                        scopeIndex === index
                          ? {
                              ...currentScope,
                              notes: event.target.value,
                            }
                          : currentScope,
                      ),
                    )
                  }
                  placeholder="Opcjonalny komentarz dla tego konkretnego zakresu."
                  value={scope.notes ?? ""}
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            data-testid="activity-add-scope"
            onClick={() =>
              setScopes((currentScopes) => [...currentScopes, createEmptyScope()])
            }
            type="button"
            variant="secondary"
          >
            Dodaj zakres
          </Button>
        </div>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Materialy</CardTitle>
          <CardDescription>
            Szczegolnie wazne przy oprysku, nawozeniu i innych zabiegach z uzyciem srodkow.
          </CardDescription>
          {state.field_errors?.materials ? (
            <p className="text-sm text-[#9a3f2b]">{state.field_errors.materials}</p>
          ) : null}
        </div>

        <input name="materials" type="hidden" value={JSON.stringify(materials)} />

        <div className="grid gap-4" data-testid="activity-materials">
          {materials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dfd3bb] px-4 py-4 text-sm text-[#5b6155]">
              Nie dodano jeszcze zadnych materialow do tego wpisu.
            </div>
          ) : null}

          {materials.map((material, index) => (
            <div
              className="grid gap-4 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4"
              data-testid={`activity-material-${index}`}
              key={`${material.name}-${index}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-semibold text-[#304335]">
                    Material {index + 1}
                  </p>
                  <p className="text-sm text-[#6f7469]">
                    Dodaj nazwe i opcjonalna ilosc lub kategorie.
                  </p>
                </div>
                <Button
                  onClick={() =>
                    setMaterials((currentMaterials) =>
                      currentMaterials.filter((_, materialIndex) => materialIndex !== index),
                    )
                  }
                  type="button"
                  variant="ghost"
                >
                  Usun material
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field htmlFor={`material_name_${index}`} label="Nazwa">
                  <Input
                    id={`material_name_${index}`}
                    onChange={(event) =>
                      setMaterials((currentMaterials) =>
                        currentMaterials.map((currentMaterial, materialIndex) =>
                          materialIndex === index
                            ? {
                                ...currentMaterial,
                                name: event.target.value,
                              }
                            : currentMaterial,
                        ),
                      )
                    }
                    value={material.name}
                  />
                </Field>
                <Field htmlFor={`material_category_${index}`} label="Kategoria">
                  <Input
                    id={`material_category_${index}`}
                    onChange={(event) =>
                      setMaterials((currentMaterials) =>
                        currentMaterials.map((currentMaterial, materialIndex) =>
                          materialIndex === index
                            ? {
                                ...currentMaterial,
                                category: event.target.value,
                              }
                            : currentMaterial,
                        ),
                      )
                    }
                    placeholder="np. spray, fertilizer, fuel"
                    value={material.category ?? ""}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field htmlFor={`material_quantity_${index}`} label="Ilosc">
                  <Input
                    id={`material_quantity_${index}`}
                    min="0"
                    onChange={(event) =>
                      setMaterials((currentMaterials) =>
                        currentMaterials.map((currentMaterial, materialIndex) =>
                          materialIndex === index
                            ? {
                                ...currentMaterial,
                                quantity: parseDecimalInput(event.target.value),
                              }
                            : currentMaterial,
                        ),
                      )
                    }
                    step="0.001"
                    type="number"
                    value={material.quantity ?? ""}
                  />
                </Field>
                <Field htmlFor={`material_unit_${index}`} label="Jednostka">
                  <Input
                    id={`material_unit_${index}`}
                    onChange={(event) =>
                      setMaterials((currentMaterials) =>
                        currentMaterials.map((currentMaterial, materialIndex) =>
                          materialIndex === index
                            ? {
                                ...currentMaterial,
                                unit: event.target.value,
                              }
                            : currentMaterial,
                        ),
                      )
                    }
                    placeholder="np. l, kg, ml"
                    value={material.unit ?? ""}
                  />
                </Field>
              </div>
              <Field htmlFor={`material_notes_${index}`} label="Notatki">
                <Textarea
                  id={`material_notes_${index}`}
                  onChange={(event) =>
                    setMaterials((currentMaterials) =>
                      currentMaterials.map((currentMaterial, materialIndex) =>
                        materialIndex === index
                          ? {
                              ...currentMaterial,
                              notes: event.target.value,
                            }
                          : currentMaterial,
                      ),
                    )
                  }
                  placeholder="Opcjonalne uwagi o uzyciu tego materialu."
                  value={material.notes ?? ""}
                />
              </Field>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            data-testid="activity-add-material"
            onClick={() =>
              setMaterials((currentMaterials) => [
                ...currentMaterials,
                createEmptyMaterial(),
              ])
            }
            type="button"
            variant="secondary"
          >
            Dodaj material
          </Button>
        </div>
      </Card>

      <Card className="grid gap-5">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Pogoda i efekt</CardTitle>
          <CardDescription>
            Te pola sa szczegolnie przydatne przy opryskach i obserwacjach terenowych.
          </CardDescription>
        </div>
        <Field
          error={state.field_errors?.weather_notes}
          htmlFor="weather_notes"
          label="Uwagi pogodowe"
        >
          <Textarea
            defaultValue={activity?.weather_notes ?? ""}
            id="weather_notes"
            name="weather_notes"
            placeholder="np. pochmurno, lekki wiatr, bez opadu"
          />
        </Field>
        <Field
          error={state.field_errors?.result_notes}
          htmlFor="result_notes"
          label="Efekt / wynik aktywnosci"
        >
          <Textarea
            defaultValue={activity?.result_notes ?? ""}
            id="result_notes"
            name="result_notes"
            placeholder="Co zostalo zrobione, co wymaga dalszej obserwacji."
          />
        </Field>
      </Card>

      <FormMessage state={state} />

      <div className="flex flex-wrap gap-3">
        <SubmitButton
          disabled={hasUnsupportedScopeSelection}
          pendingLabel={
            mode === "create" ? "Zapisywanie aktywnosci..." : "Aktualizowanie aktywnosci..."
          }
        >
          {mode === "create" ? "Zapisz aktywnosc" : "Zapisz zmiany"}
        </SubmitButton>
        <LinkButton href="/activities" variant="secondary">
          Wroc do aktywnosci
        </LinkButton>
      </div>
    </form>
  );
}
