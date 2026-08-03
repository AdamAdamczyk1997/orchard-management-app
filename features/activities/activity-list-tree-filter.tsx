"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { TreePicker } from "@/features/trees/tree-picker";
import type { PlotOption } from "@/types/contracts";

type ActivityListTreeFilterProps = {
  plotOptions: PlotOption[];
  initialPlotId?: string;
  initialTreeId?: string;
};

export function ActivityListTreeFilter({
  plotOptions,
  initialPlotId = "",
  initialTreeId = "",
}: ActivityListTreeFilterProps) {
  const [selectedPlotId, setSelectedPlotId] = useState(initialPlotId);
  const [selectedTreeId, setSelectedTreeId] = useState(initialTreeId);

  return (
    <>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#304335]">Dzialka</span>
        <Select
          id="activity_plot_filter"
          name="plot_id"
          onChange={(event) => {
            setSelectedPlotId(event.target.value);
            setSelectedTreeId("");
          }}
          value={selectedPlotId}
        >
          <option value="">Wszystkie dzialki</option>
          {plotOptions.map((plot) => (
            <option key={plot.id} value={plot.id}>
              {plot.name}
              {plot.status === "archived" ? " (zarchiwizowana)" : ""}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid gap-2">
        <label
          className="text-sm font-medium text-[#304335]"
          htmlFor="activity_tree_filter"
        >
          Drzewo
        </label>
        <TreePicker
          emptyOptionLabel="Wszystkie drzewa"
          id="activity_tree_filter"
          name="tree_id"
          onChange={(treeId, option) => {
            setSelectedTreeId(treeId);

            if (option && option.plot_id !== selectedPlotId) {
              setSelectedPlotId(option.plot_id);
            }
          }}
          plotId={selectedPlotId}
          searchPlaceholder="Szukaj po kodzie, nazwie lub sekcji"
          value={selectedTreeId}
        />
      </div>
    </>
  );
}
