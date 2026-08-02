"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TreeOption } from "@/types/contracts";

type TreePickerProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (treeId: string, option?: TreeOption) => void;
  plotId?: string;
  initialOptions?: TreeOption[];
  emptyOptionLabel: string;
  searchPlaceholder?: string;
  disabled?: boolean;
};

type TreeOptionsResponse = {
  options?: unknown;
};

const EMPTY_TREE_OPTIONS: TreeOption[] = [];

function isTreeOption(value: unknown): value is TreeOption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const option = value as Partial<TreeOption>;

  return (
    typeof option.id === "string" &&
    typeof option.plot_id === "string" &&
    typeof option.plot_name === "string" &&
    typeof option.label === "string" &&
    typeof option.is_active === "boolean"
  );
}

function mergeTreeOptions(...groups: TreeOption[][]) {
  const optionsById = new Map<string, TreeOption>();

  for (const group of groups) {
    for (const option of group) {
      optionsById.set(option.id, option);
    }
  }

  return [...optionsById.values()];
}

function getSelectedOption(options: TreeOption[], value: string) {
  return options.find((option) => option.id === value);
}

export function TreePicker({
  id,
  name,
  value,
  onChange,
  plotId,
  initialOptions = EMPTY_TREE_OPTIONS,
  emptyOptionLabel,
  searchPlaceholder = "Szukaj po kodzie, nazwie lub sekcji",
  disabled = false,
}: TreePickerProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(() => mergeTreeOptions(initialOptions));
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const trimmedQuery = query.trim();

  useEffect(() => {
    setOptions((currentOptions) => mergeTreeOptions(initialOptions, currentOptions));
  }, [initialOptions]);

  useEffect(() => {
    const shouldFetch =
      Boolean(plotId) || trimmedQuery.length >= 2 || Boolean(value);

    if (!shouldFetch || disabled) {
      setIsLoading(false);
      setHasError(false);
      setOptions((currentOptions) =>
        value
          ? currentOptions.filter((option) => option.id === value)
          : [],
      );
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    if (plotId) {
      params.set("plot_id", plotId);
    }

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    }

    if (value) {
      params.append("include_id", value);
    }

    params.set("limit", "50");
    setIsLoading(true);
    setHasError(false);

    fetch(`/api/tree-options?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Tree option search failed.");
        }

        return response.json() as Promise<TreeOptionsResponse>;
      })
      .then((data) => {
        const fetchedOptions = Array.isArray(data.options)
          ? data.options.filter(isTreeOption)
          : [];

        setOptions((currentOptions) =>
          mergeTreeOptions(
            fetchedOptions,
            initialOptions,
            value
              ? currentOptions.filter((option) => option.id === value)
              : [],
          ),
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setHasError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [disabled, initialOptions, plotId, trimmedQuery, value]);

  const selectedOption = getSelectedOption(options, value);
  const selectOptions = useMemo(() => {
    if (!value || selectedOption) {
      return options;
    }

    return [
      {
        id: value,
        plot_id: plotId ?? "",
        plot_name: "",
        label: "Wybrane drzewo",
        is_active: true,
      } satisfies TreeOption,
      ...options,
    ];
  }, [options, plotId, selectedOption, value]);
  const showSearchPrompt = !plotId && trimmedQuery.length > 0 && trimmedQuery.length < 2;

  return (
    <div className="grid gap-2">
      <Input
        aria-label="Szukaj drzewa"
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        type="search"
        value={query}
      />
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Select
          aria-busy={isLoading}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(nextValue, getSelectedOption(selectOptions, nextValue));
          }}
          value={value}
        >
          <option value="">{emptyOptionLabel}</option>
          {selectOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
              {option.is_active ? "" : " (nieaktywne)"}
            </option>
          ))}
        </Select>
        {value ? (
          <Button
            className="min-h-11 px-3"
            disabled={disabled}
            onClick={() => onChange("")}
            type="button"
            variant="secondary"
          >
            Wyczysc
          </Button>
        ) : null}
      </div>
      {isLoading ? (
        <p className="text-sm text-[#6f7469]">Ladowanie drzew...</p>
      ) : null}
      {hasError ? (
        <p className="text-sm text-[#9a3f2b]">
          Nie udalo sie pobrac listy drzew.
        </p>
      ) : null}
      {showSearchPrompt ? (
        <p className="text-sm text-[#6f7469]">
          Wpisz co najmniej 2 znaki, aby szukac bez wybranej dzialki.
        </p>
      ) : null}
    </div>
  );
}
