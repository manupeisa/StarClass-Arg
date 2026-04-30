import { championshipSlug } from "./slug";
import { normalizeText } from "./text";

function parseDate(date) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getComparableChampionshipDate(championship, index = 0) {
  const raceDates = (championship?.raceDates || [])
    .map(parseDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const startDate = raceDates[0] || parseDate(championship?.startDate || championship?.start || championship?.endDate || championship?.end);
  return startDate?.getTime() || Number.MAX_SAFE_INTEGER + index;
}

export function getCompletedChampionships(championships = []) {
  return [...championships]
    .filter((championship) => (championship?.results || []).length > 0)
    .sort((a, b) => getComparableChampionshipDate(a) - getComparableChampionshipDate(b));
}

export function buildChampionshipColumns(championships = []) {
  // Only include championships explicitly marked for inclusion (default: include)
  const filtered = getCompletedChampionships(championships).filter((c) => c.includeInGeneral !== false);
  return filtered.map((championship, index) => ({
    key: championshipSlug(championship, index),
    label: championship.name || `Campeonato ${index + 1}`,
    lastPlaceScore: getLastPlaceScore(championship),
  }));
}

export function getLastPlaceScore(championship) {
  const scores = (championship?.results || [])
    .map((result) => getChampionshipResultScore(result, championship?.discardCount || 0))
    .filter((score) => Number.isFinite(score));

  if (!scores.length) {
    return 0;
  }

  return Math.max(...scores);
}

export function getChampionshipResultScore(result, discardCount = 0) {
  const races = Array.isArray(result?.races) ? result.races.map((v) => Number(v)).filter((n) => Number.isFinite(n)) : [];

  if (races.length) {
    if (discardCount > 0) {
      const sortedDesc = [...races].sort((a, b) => b - a);
      const remaining = sortedDesc.slice(discardCount);
      return remaining.reduce((s, n) => s + n, 0);
    }

    return races.reduce((total, value) => total + value, 0);
  }

  const fallback = Number(result?.score);
  return Number.isFinite(fallback) ? fallback : 0;
}

export function normalizeRankingScore(value) {
  if (value === "" || value == null) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function getGeneralRankingDisplayScore(row, championshipKey) {
  const score = normalizeRankingScore(row?.championshipScores?.[championshipKey]);
  return score == null ? "N/A" : score;
}

export function calculateGeneralRankingTotal(row, championshipColumns = []) {
  const championshipScores = row?.championshipScores || {};

  if (!championshipColumns.length) {
    return Number(row?.points ?? row?.score ?? row?.total ?? 0) || 0;
  }

  if (!Object.keys(championshipScores).length) {
    return Number(row?.points ?? row?.score ?? row?.total ?? 0) || 0;
  }

  return championshipColumns.reduce((total, column) => {
    const score = normalizeRankingScore(championshipScores[column.key]);
    return total + (score == null ? column.lastPlaceScore : score);
  }, 0);
}

export function getGeneralRankingAbsences(row, championshipColumns = []) {
  const championshipScores = row?.championshipScores || {};
  const attended = championshipColumns.filter((column) => normalizeRankingScore(championshipScores[column.key]) != null).length;
  return Math.max(championshipColumns.length - attended, 0);
}

export function isGeneralRankingEligible(row, championshipColumns = []) {
  return getGeneralRankingAbsences(row, championshipColumns) <= 1;
}

export function buildGeneralRankingData(championships = []) {
  const completedChampionships = getCompletedChampionships(championships).filter((c) => c.includeInGeneral !== false);
  const championshipColumns = buildChampionshipColumns(completedChampionships);
  const rowsByHelm = new Map();

  completedChampionships.forEach((championship, championshipIndex) => {
    const championshipKey = championshipSlug(championship, championshipIndex);

    (championship.results || []).forEach((result) => {
      const helm = String(result?.helm || result?.boat || result?.crew || "").trim();

      if (!helm) {
        return;
      }

      const rowKey = normalizeText(helm);
      const existing = rowsByHelm.get(rowKey) || {
        position: 0,
        boat: "",
        helm,
        crew: "",
        appearances: 0,
        championshipScores: {},
      };

      const score = normalizeRankingScore(getChampionshipResultScore(result, championship?.discardCount || 0));
      if (score != null) {
        existing.championshipScores[championshipKey] = score;
        existing.appearances += 1;
      }

      existing.boat = String(result.boat || existing.boat || "").trim();
      existing.helm = String(result.helm || existing.helm || "").trim();
      existing.crew = String(result.crew || existing.crew || "").trim();
      rowsByHelm.set(rowKey, existing);
    });
  });

  const rows = [...rowsByHelm.values()]
    .filter((row) => isGeneralRankingEligible(row, championshipColumns))
    .map((row) => ({
      ...row,
      total: calculateGeneralRankingTotal(row, championshipColumns),
    }))
    .sort((a, b) => {
      if (a.total !== b.total) {
        return a.total - b.total;
      }

      if (a.appearances !== b.appearances) {
        return b.appearances - a.appearances;
      }

      return a.helm.localeCompare(b.helm, "es");
    })
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }));

  return { championshipColumns, rows };
}
