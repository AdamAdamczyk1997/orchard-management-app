type ParsedPlotCode = {
  prefix: string;
  number: number;
  width: number;
};

function parsePlotCode(code: string): ParsedPlotCode | null {
  const trimmed = code.trim();
  const match = /^(.*?)(\d+)$/.exec(trimmed);

  if (!match) {
    return null;
  }

  const [, prefix, numericPart] = match;
  const number = Number.parseInt(numericPart, 10);

  if (!Number.isSafeInteger(number)) {
    return null;
  }

  return {
    prefix,
    number,
    width: numericPart.length,
  };
}

export function suggestNextPlotCode(
  codes: Array<string | null | undefined>,
): string | undefined {
  const nonEmptyCodes = codes.filter(
    (code): code is string => typeof code === "string" && code.trim().length > 0,
  );

  if (nonEmptyCodes.length === 0) {
    return undefined;
  }

  const parsedCodes = nonEmptyCodes.map(parsePlotCode);

  if (parsedCodes.some((code) => code === null)) {
    return undefined;
  }

  const [firstCode] = parsedCodes as ParsedPlotCode[];
  const hasMixedPattern = (parsedCodes as ParsedPlotCode[]).some(
    (code) => code.prefix !== firstCode.prefix || code.width !== firstCode.width,
  );

  if (hasMixedPattern) {
    return undefined;
  }

  const nextNumber =
    Math.max(...(parsedCodes as ParsedPlotCode[]).map((code) => code.number)) + 1;

  return `${firstCode.prefix}${String(nextNumber).padStart(firstCode.width, "0")}`;
}
