export function createSlugBase(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function createUniqueSlug(input: string) {
  const base = createSlugBase(input) || "galleria";
  const uniqueSuffix = Date.now().toString(36);

  return `${base}-${uniqueSuffix}`;
}