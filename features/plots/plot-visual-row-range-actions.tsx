"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { buildPlotVisualRowRangeActivityHref } from "@/lib/domain/plot-visual-row-detail";

type PlotVisualRowRangeActionsProps = {
  plotId: string;
  sectionName?: string | null;
  rowNumber: number;
  rowTreeCount: number;
};

function parsePositiveInteger(value: string) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function PlotVisualRowRangeActions({
  plotId,
  sectionName,
  rowNumber,
  rowTreeCount,
}: PlotVisualRowRangeActionsProps) {
  const [fromPosition, setFromPosition] = useState("1");
  const [toPosition, setToPosition] = useState(
    String(Math.max(1, Math.min(rowTreeCount, 50))),
  );
  const href = useMemo(() => {
    const parsedFromPosition = parsePositiveInteger(fromPosition);
    const parsedToPosition = parsePositiveInteger(toPosition);

    if (!parsedFromPosition || !parsedToPosition) {
      return null;
    }

    return buildPlotVisualRowRangeActivityHref({
      plot_id: plotId,
      section_name: sectionName,
      row_number: rowNumber,
      from_position: parsedFromPosition,
      to_position: parsedToPosition,
    });
  }, [fromPosition, plotId, rowNumber, sectionName, toPosition]);
  const hasInvalidRange = href === null;

  return (
    <div
      className="grid gap-4 border-t border-[#eadfcb] pt-4"
      data-testid="plot-visual-row-range-actions"
    >
      <div className="grid gap-1">
        <h3 className="text-base font-semibold text-[#304335]">
          Akcja dla zakresu rzedu
        </h3>
        <p className="text-sm text-[#6f7469]">
          Wpisz zakres pozycji, aby przejsc do aktywnosci bez renderowania
          calego rzedu jako markerow.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#304335]">
            Od pozycji
          </span>
          <Input
            min={1}
            onChange={(event) => setFromPosition(event.target.value)}
            type="number"
            value={fromPosition}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#304335]">
            Do pozycji
          </span>
          <Input
            min={1}
            onChange={(event) => setToPosition(event.target.value)}
            type="number"
            value={toPosition}
          />
        </label>
        {href ? (
          <LinkButton className="w-full md:w-auto" href={href}>
            Dodaj aktywnosc
          </LinkButton>
        ) : (
          <Button className="w-full md:w-auto" disabled type="button">
            Dodaj aktywnosc
          </Button>
        )}
      </div>
      {hasInvalidRange ? (
        <p className="text-sm text-[#9a3f2b]">
          Podaj dodatni zakres, w ktorym koniec nie jest mniejszy od poczatku.
        </p>
      ) : null}
    </div>
  );
}
