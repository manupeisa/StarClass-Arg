export function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function championshipSlug(championship, index = 0) {
  return slugify(championship?.slug || championship?.name || `campeonato-${index + 1}`);
}
