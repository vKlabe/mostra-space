export type ArtworkDimensionInput = string | number | null | undefined;

export function parseDimensionCm(value: ArtworkDimensionInput) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized =
    typeof value === "string" ? value.replace(",", ".").trim() : value;

  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (numberValue <= 0) {
    return null;
  }

  return Math.round(numberValue * 100) / 100;
}

export function parseOptionalDepthCm(value: ArtworkDimensionInput) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized =
    typeof value === "string" ? value.replace(",", ".").trim() : value;

  const numberValue = Number(normalized);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  if (numberValue < 0) {
    return null;
  }

  return Math.round(numberValue * 100) / 100;
}

export function getArtworkDisplaySizeCm({
  widthCm,
  heightCm,
  fallbackCm = 50,
}: {
  widthCm?: number | null;
  heightCm?: number | null;
  fallbackCm?: number;
}) {
  return {
    widthCm: widthCm && widthCm > 0 ? widthCm : fallbackCm,
    heightCm: heightCm && heightCm > 0 ? heightCm : fallbackCm,
  };
}

export function formatCm(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "N/D";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "N/D";
  }

  return `${numberValue.toFixed(2)} cm`;
}