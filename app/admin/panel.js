"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  House,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Sheet,
  Trash2,
} from "lucide-react";
import DateCalendar, { formatAdminDate } from "../../components/ui/date-calendar";
import {
  buildChampionshipColumns,
  buildGeneralRankingData,
  calculateGeneralRankingTotal,
  getChampionshipResultScore,
} from "../../lib/general-ranking";
import { GeneralRankingTable } from "../../components/ui/general-ranking";

const uploadTargetBytes = 3.8 * 1024 * 1024;

const adminSections = [
  { id: "site-settings", label: "Ajustes" },
  { id: "hero", label: "Hero" },
  { id: "sudamericano", label: "Sudamericano" },
  { id: "posicionamiento", label: "General" },
  { id: "campeonatos", label: "Campeonatos" },
  { id: "galeria", label: "Fotos" },
  { id: "dues", label: "Dues" },
  { id: "calendario", label: "Calendario" },
];

function emptyResult(position = 1) {
  return { position, boat: "", helm: "", crew: "", score: 0, races: [] };
}

function emptyGallery() {
  return { title: "Nueva foto", caption: "", image: "" };
}

function emptyDuesRow() {
  return {
    boat: "",
    owner: "",
    fleet: "",
    crew: "",
    helmDues: "Pendiente",
    crewDues: "Pendiente",
    fay: "No",
  };
}

function emptyHeroImage() {
  return "";
}

function normalizeHeroImages(images) {
  return (images || [])
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.url || item.image || "";
      return "";
    })
    .filter(Boolean);
}

const defaultSudamericano = {
  heroKicker: "Campeonato Sudamericano de StarClass",
  heroTitle: "Un nuevo evento de la clase con todos los condimentos que ofrece Buenos Aires.",
  heroText:
    "Cuatro dias para reunir talento, tradicion y competencia de alto nivel en la clase Star. La cuenta regresiva ya empezo.",
  heroImage: "",
  venueUrl: "https://yca.org.ar/event-location/sede-darsena-norte/",
  eventCardTitle: "Sudamericano 2026",
  infoEyebrow: "Buenos Aires 2026",
  infoTitle: "Un campeonato para mirar de cerca",
  infoText:
    "El Sudamericano es una oportunidad para ver a la clase Star en su mejor formato: tripulaciones finas, decisiones tacticas exigentes y una cancha que premia experiencia.",
  venueKicker: "Sede",
  venueTitle: "YCA Darsena Norte como punto de encuentro.",
  venueText:
    "La sede historica del Yacht Club Argentino suma identidad portuaria, cercania con la ciudad y una base ideal para recibir a las tripulaciones del Sudamericano.",
  venueButtonLabel: "Ver sede del club",
  venueImage: "/yca-darsena-norte.jpg",
  venueImageCredit: "Jrivell",
  venueImageSource: "https://commons.wikimedia.org/wiki/File:Predio_del_Yacht_Club_de_Buenos_Aires,_Edificio_del_Yacht_Club.jpg",
  venueImageLicense: "https://creativecommons.org/licenses/by-sa/3.0/",
  splitKicker: "Expectativa",
  splitTitle: "Una cita regional con identidad de flota.",
  splitText:
    "La Darsena prepara un escenario ideal para recibir a timoneles y tripulantes de la region. El campeonato combina intensidad deportiva, comunidad y el valor historico de una clase que sigue convocando a los mejores navegantes.",
  splitImage: "/uploads/flo-8042-copia-1777585686571.jpg",
  badgeWater: "Rio de la Plata",
  badgeDate: "Diciembre 2026",
  badgeVenue: "YCA Darsena",
};

function emptyEvent() {
  return {
    title: "Nueva competencia",
    type: "Regata",
    club: "",
    location: "",
    start: "",
    end: "",
    link: "",
  };
}

function emptyChampionship() {
  return {
    name: "Nuevo campeonato",
    date: "",
    startDate: "",
    endDate: "",
    raceDates: [],
    raceCount: 0,
    location: "",
    link: "",
    summary: "",
    photoFolder: "",
    photos: [],
    results: [emptyResult()],
  };
}

function updateArrayItem(items, index, patch) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function championshipTime(championship) {
  const sortedDates = [...(championship.raceDates || [])].filter(Boolean).sort();
  const value = sortedDates[0] || championship.startDate || championship.endDate;
  const time = value ? new Date(`${value}T12:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

async function compressImageFile(file, options = {}) {
  if (!file?.type?.startsWith("image/")) return file;

  const {
    maxSize = 1600,
    quality = 0.82,
    skipIfBelowBytes = 2.5 * 1024 * 1024,
    targetBytes = uploadTargetBytes,
    minSize = 960,
    minQuality = 0.62,
  } = options;

  const smallEnough = file.size <= Math.min(skipIfBelowBytes, targetBytes) && /image\/(jpeg|jpg|webp)/i.test(file.type);
  if (smallEnough) return file;

  let bitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  let longestSide = Math.min(maxSize, Math.max(bitmap.width, bitmap.height));
  let currentQuality = quality;
  let outputBlob = null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }

  while (longestSide >= minSize) {
    const ratio = Math.min(longestSide / bitmap.width, longestSide / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    outputBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", currentQuality));

    if (outputBlob && outputBlob.size <= targetBytes) {
      break;
    }

    if (currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - 0.08);
    } else {
      longestSide = Math.floor(longestSide * 0.82);
      currentQuality = quality;
    }
  }

  bitmap.close?.();

  if (!outputBlob) return file;

  if (outputBlob.size > targetBytes) {
    throw new Error("La imagen es demasiado grande. Proba exportarla en JPG o reducirla antes de subirla.");
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([outputBlob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function parseUploadResponse(response) {
  let body;

  try {
    body = await response.json();
  } catch (parseErr) {
    console.error("Error parsing JSON response:", parseErr, response.status);

    if (response.status === 413) {
      throw new Error("la imagen sigue siendo demasiado pesada para subirla. Proba con una foto mas chica.");
    }

    throw new Error(`respuesta invalida del servidor (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(body.message || `error ${response.status}`);
  }

  return body;
}

async function postImageFile(file) {
  const optimized = await compressImageFile(file, {
    maxSize: 1800,
    quality: 0.84,
    skipIfBelowBytes: uploadTargetBytes,
  });
  const form = new FormData();
  form.append("file", optimized);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  return parseUploadResponse(response);
}

async function postHeroImageFile(file) {
  const optimized = await compressImageFile(file, {
    maxSize: 2400,
    quality: 0.86,
    skipIfBelowBytes: uploadTargetBytes,
    minSize: 1280,
    minQuality: 0.66,
  });
  const form = new FormData();
  form.append("file", optimized);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  return parseUploadResponse(response);
}

export default function AdminPanel({ initialData }) {
  const [data, setData] = useState(initialData);
  const [championshipIndex, setChampionshipIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generalValidationError, setGeneralValidationError] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [activeAdminSection, setActiveAdminSection] = useState(adminSections[1].id);

  const championship = data.championships[championshipIndex] || data.championships[0];
  const championshipColumns = useMemo(
    () => buildChampionshipColumns([...data.championships].sort((a, b) => championshipTime(a) - championshipTime(b))),
    [data.championships],
  );
  const { rows: generalRankingRows } = useMemo(
    () => buildGeneralRankingData(data.championships),
    [data.championships],
  );
  const generalMode = data.generalRankingMode || "auto";
  const activeSection = adminSections.find((section) => section.id === activeAdminSection) || adminSections[1];
  const sudamericano = { ...defaultSudamericano, ...(data.sudamericano || {}) };

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      if (adminSections.some((section) => section.id === hash)) {
        setActiveAdminSection(hash);
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function openAdminSection(id) {
    setActiveAdminSection(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  const paidSummary = useMemo(() => {
    const paid = data.dues.filter((dues) => (dues.helmDues || dues.status) !== "Pendiente").length;
    return `${paid}/${data.dues.length} timoneles activos`;
  }, [data.dues]);

  const invalidManualIndexes = useMemo(() => {
    const rows = data.generalRanking || [];
    const idxSet = new Set();
    if (!rows.length) return idxSet;

    const mapped = rows.map((r) => ({ position: Number(r.position) || 0, points: Number(r.points ?? (r.points === 0 ? r.points : NaN)) }));
    const sorted = [...mapped].sort((a, b) => a.position - b.position);
    const positionToIndex = new Map();
    rows.forEach((r, i) => positionToIndex.set(Number(r.position) || i + 1, i));

    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (Number.isNaN(cur.points) || Number.isNaN(next.points)) continue;
      if (!(cur.points < next.points)) {
        const curIdx = positionToIndex.get(cur.position) ?? i;
        const nextIdx = positionToIndex.get(next.position) ?? i + 1;
        idxSet.add(curIdx);
        idxSet.add(nextIdx);
      }
    }

    return idxSet;
  }, [data.generalRanking]);

  function patchData(patch) {
    setData((current) => ({ ...current, ...patch }));
  }

  function patchChampionship(patch) {
    setData((current) => ({
      ...current,
      championships: updateArrayItem(current.championships, championshipIndex, patch),
    }));
  }

  function patchHero(patch) {
    setData((current) => ({
      ...current,
      hero: {
        ...(current.hero || {}),
        ...(patch.images ? { images: normalizeHeroImages(patch.images) } : patch),
      },
    }));
  }

  function patchSudamericano(patch) {
    setData((current) => ({
      ...current,
      sudamericano: {
        ...defaultSudamericano,
        ...(current.sudamericano || {}),
        ...patch,
      },
    }));
  }

  function patchSocial(patch) {
    setData((current) => ({
      ...current,
      social: {
        ...(current.social || {}),
        ...(patch || {}),
      },
    }));
  }

  function addSocialItem() {
    const current = data.social || {};
    const instagram = Array.isArray(current.instagram) ? current.instagram : current.instagram ? [current.instagram] : [];
    const next = [...instagram, { label: "@nueva", url: "https://" }];
    patchSocial({ instagram: next });
  }

  function updateSocialItem(index, patch) {
    const current = data.social || {};
    const instagram = Array.isArray(current.instagram) ? current.instagram : current.instagram ? [current.instagram] : [];
    const next = instagram.map((it, i) => (i === index ? { ...it, ...patch } : it));
    patchSocial({ instagram: next });
  }

  function removeSocialItem(index) {
    const current = data.social || {};
    const instagram = Array.isArray(current.instagram) ? current.instagram : current.instagram ? [current.instagram] : [];
    const next = instagram.filter((_, i) => i !== index);
    patchSocial({ instagram: next });
  }

  async function uploadSudamericanoImage(file, field) {
    if (!file) return;

    try {
      const body = await postImageFile(file);

      if (body?.url) {
        const nextData = {
          ...data,
          sudamericano: {
            ...defaultSudamericano,
            ...(data.sudamericano || {}),
            [field]: body.url,
          },
        };
        setData(nextData);
        await saveData(nextData);
        setMessage("Imagen del Sudamericano actualizada.");
      } else {
        setMessage(body.message || "No se pudo subir la imagen.");
      }
    } catch (err) {
      console.error("Upload sudamericano image error:", err);
      setMessage(`Error al subir imagen del Sudamericano: ${err.message}`);
    }
  }

  async function uploadHeroImage(file) {
    if (!file) return;

    try {
      const body = await postHeroImageFile(file);
      if (body?.url) {
        const nextHeroImages = [...new Set([...normalizeHeroImages(data.hero?.images), body.url])];
        const nextData = { ...data, hero: { ...(data.hero || {}), images: nextHeroImages } };
        setData(nextData);
        await saveData(nextData);
        setMessage("Foto agregada al hero.");
      }
    } catch (err) {
      console.error("Upload hero image error:", err);
      setMessage(`Error al subir al hero: ${err.message}`);
    }
  }

  async function uploadHeroImages(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    try {
      const urls = [];
      for (const file of selected) {
        const body = await postHeroImageFile(file);
        if (body?.url) urls.push(body.url);
      }

      if (urls.length) {
        const nextHeroImages = [...new Set([...normalizeHeroImages(data.hero?.images), ...urls])];
        const nextData = { ...data, hero: { ...(data.hero || {}), images: nextHeroImages } };
        setData(nextData);
        await saveData(nextData);
        setMessage(`Se subieron ${urls.length} fotos al hero.`);
      }
    } catch (err) {
      console.error("Upload hero images error:", err);
      setMessage(`Error al subir fotos al hero: ${err.message}`);
    }
  }

  async function addGalleryToHero(count = 3) {
    const urls = (data.gallery || []).map((item) => item.image).filter(Boolean).slice(0, count);
    if (!urls.length) return;

    const nextHeroImages = [...new Set([...normalizeHeroImages(data.hero?.images), ...urls])];
    const nextData = { ...data, hero: { ...(data.hero || {}), images: nextHeroImages } };
    setData(nextData);
    await saveData(nextData);
    setMessage("Fotos de la galería agregadas al hero.");
  }

  async function addChampionshipToHero() {
    const urls = (championship?.photos || []).filter(Boolean).slice(0, 5);
    if (!urls.length) return;

    const nextHeroImages = [...new Set([...normalizeHeroImages(data.hero?.images), ...urls])];
    const nextData = { ...data, hero: { ...(data.hero || {}), images: nextHeroImages } };
    setData(nextData);
    await saveData(nextData);
    setMessage("Fotos del campeonato agregadas al hero.");
  }

  async function removeHeroImage(index) {
    const nextHeroImages = normalizeHeroImages(data.hero?.images).filter((_, itemIndex) => itemIndex !== index);
    const nextData = { ...data, hero: { ...(data.hero || {}), images: nextHeroImages } };
    setData(nextData);
    await saveData(nextData);
  }

  function patchResult(index, patch) {
    const base = championship.results[index] || emptyResult(index + 1);
    const nextRow = { ...base, ...patch };
    nextRow.score = getChampionshipResultScore(nextRow, championship?.discardCount || 0);
    const results = updateArrayItem(championship.results, index, nextRow);
    patchChampionship({ results });
  }

  function getRaceCount(champ = championship) {
    const explicit = Number(champ?.raceCount);
    const fromDates = (champ?.raceDates || []).length;
    const fromRows = Math.max(
      0,
      ...((champ?.results || []).map((row) => {
        if (Array.isArray(row?.races)) return row.races.length;
        return 0;
      })),
    );

    if (Number.isFinite(explicit) && explicit > 0) {
      return Math.max(explicit, fromDates, fromRows);
    }

    return Math.max(fromDates, fromRows, 0);
  }

  function setRaceCount(nextValue) {
    const nextCount = Math.max(0, Number(nextValue) || 0);
    const discard = championship?.discardCount || 0;
    const nextResults = (championship.results || []).map((row) => {
      const current = Array.isArray(row.races) ? row.races : [];
      const races = Array.from({ length: nextCount }, (_, index) => current[index] ?? "");
      return { ...row, races, score: getChampionshipResultScore({ ...row, races }, discard) };
    });

    patchChampionship({ raceCount: nextCount, results: nextResults });
  }

  function patchResultRaceValue(resultIndex, raceIndex, value) {
    const row = championship.results?.[resultIndex] || emptyResult(resultIndex + 1);
    const count = Math.max(getRaceCount(), raceIndex + 1);
    const current = Array.isArray(row.races) ? row.races : [];
    const races = Array.from({ length: count }, (_, idx) => current[idx] ?? "");
    races[raceIndex] = value;
    const score = getChampionshipResultScore({ ...row, races }, championship?.discardCount || 0);
    const results = updateArrayItem(championship.results, resultIndex, { races, score });
    patchChampionship({ results, raceCount: count });
  }

  function validateManualRanking(rows) {
    if (!rows || !rows.length) return "";
    // build array by position order (ascending positions: 1,2,3...)
    const mapped = rows.map((r) => ({ position: Number(r.position) || 0, points: Number(r.points ?? r.points === 0 ? r.points : NaN) }));
    mapped.sort((a, b) => a.position - b.position);
    for (let i = 0; i < mapped.length - 1; i++) {
      const cur = mapped[i];
      const next = mapped[i + 1];
      // if either is not a number, skip validation for now
      if (Number.isNaN(cur.points) || Number.isNaN(next.points)) continue;
      if (!(cur.points < next.points)) {
        return `El puntaje de la posición ${cur.position || i + 1} debe ser menor que el de la posición ${next.position || i + 2}.`;
      }
    }
    return "";
  }

  function setDiscardCount(nextValue) {
    const nextDiscard = Math.max(0, Number(nextValue) || 0);
    const nextResults = (championship.results || []).map((row) => {
      const current = Array.isArray(row.races) ? row.races : [];
      const score = getChampionshipResultScore({ ...row, races: current }, nextDiscard);
      return { ...row, score };
    });
    patchChampionship({ discardCount: nextDiscard, results: nextResults });
  }

  function deleteChampionship(indexToDelete) {
    const toDelete = data.championships?.[indexToDelete];
    if (!toDelete) return;
    if (!window.confirm(`¿Eliminar el campeonato "${toDelete.name}"? Esta acción no se puede deshacer.`)) return;
    const championships = data.championships.filter((_, i) => i !== indexToDelete);
    const nextIndex = Math.max(0, Math.min(championshipIndex, championships.length - 1));
    patchData({ championships });
    setChampionshipIndex(nextIndex);
  }

  function setGeneralMode(mode) {
    if (mode === "manual") {
      // if no manual rows exist, seed with computed rows
      if (!(data.generalRanking && data.generalRanking.length)) {
        const computed = buildGeneralRankingData(data.championships).rows;
        patchData({ generalRanking: computed, generalRankingMode: "manual" });
        return;
      }
    }

    patchData({ generalRankingMode: mode });
  }

  function addGeneralRow() {
    setData((prev) => {
      const next = [...(prev.generalRanking || []), { position: (prev.generalRanking || []).length + 1, boat: "", helm: "", crew: "", championshipScores: {} }];
      // if manual mode, keep sorted by points
      if ((prev.generalRankingMode || generalMode) === "manual") {
        next.sort((a, b) => {
          const pa = Number(a.points ?? calculateGeneralRankingTotal(a, championshipColumns));
          const pb = Number(b.points ?? calculateGeneralRankingTotal(b, championshipColumns));
          if (Number.isNaN(pa) && Number.isNaN(pb)) return 0;
          if (Number.isNaN(pa)) return 1;
          if (Number.isNaN(pb)) return -1;
          return pa - pb;
        });
        next.forEach((r, i) => (r.position = i + 1));
      }

      const err = validateManualRanking(next);
      setGeneralValidationError(err);
      return { ...prev, generalRanking: next };
    });
  }

  function patchGeneralRow(index, patch) {
    setData((prev) => {
      const updated = updateArrayItem(prev.generalRanking || [], index, patch);

      // if manual mode and not currently editing, sort by points ascending and reassign positions
      if ((prev.generalRankingMode || generalMode) === "manual" && editingIndex == null) {
        updated.sort((a, b) => {
          const pa = Number(a.points ?? calculateGeneralRankingTotal(a, championshipColumns));
          const pb = Number(b.points ?? calculateGeneralRankingTotal(b, championshipColumns));
          if (Number.isNaN(pa) && Number.isNaN(pb)) return 0;
          if (Number.isNaN(pa)) return 1;
          if (Number.isNaN(pb)) return -1;
          return pa - pb;
        });
        updated.forEach((r, i) => (r.position = i + 1));
      }

      const err = validateManualRanking(updated);
      setGeneralValidationError(err);
      return { ...prev, generalRanking: updated };
    });
  }

  function finalizeManualSort() {
    setData((prev) => {
      const updated = [...(prev.generalRanking || [])];
      updated.sort((a, b) => {
        const pa = Number(a.points ?? calculateGeneralRankingTotal(a, championshipColumns));
        const pb = Number(b.points ?? calculateGeneralRankingTotal(b, championshipColumns));
        if (Number.isNaN(pa) && Number.isNaN(pb)) return 0;
        if (Number.isNaN(pa)) return 1;
        if (Number.isNaN(pb)) return -1;
        return pa - pb;
      });
      updated.forEach((r, i) => (r.position = i + 1));
      const err = validateManualRanking(updated);
      setGeneralValidationError(err);
      return { ...prev, generalRanking: updated };
    });
  }

  function removeGeneralRow(index) {
    const row = (data.generalRanking || [])[index];
    if (!row) return;
    const name = row.helm || row.boat || `fila ${index + 1}`;
    if (!window.confirm(`¿Eliminar ${name} de la tabla general?`)) return;
    setData((prev) => {
      const next = (prev.generalRanking || []).filter((_, i) => i !== index);
      if ((prev.generalRankingMode || generalMode) === "manual") {
        next.sort((a, b) => {
          const pa = Number(a.points ?? calculateGeneralRankingTotal(a, championshipColumns));
          const pb = Number(b.points ?? calculateGeneralRankingTotal(b, championshipColumns));
          if (Number.isNaN(pa) && Number.isNaN(pb)) return 0;
          if (Number.isNaN(pa)) return 1;
          if (Number.isNaN(pb)) return -1;
          return pa - pb;
        });
        next.forEach((r, i) => (r.position = i + 1));
      }
      const err = validateManualRanking(next);
      setGeneralValidationError(err);
      return { ...prev, generalRanking: next };
    });
  }

  function toggleRaceDate(value) {
    const currentDates = championship.raceDates || [];
    const raceDates = currentDates.includes(value)
      ? currentDates.filter((date) => date !== value)
      : [...currentDates, value];
    const sorted = raceDates.filter(Boolean).sort();

    patchChampionship({
      raceDates: sorted,
      startDate: sorted[0] || championship.startDate || "",
      endDate: sorted[sorted.length - 1] || championship.endDate || "",
    });
  }

  function removeRaceDate(index) {
    const sorted = (championship.raceDates || []).filter((_, dateIndex) => dateIndex !== index).filter(Boolean).sort();
    patchChampionship({
      raceDates: sorted,
      startDate: sorted[0] || "",
      endDate: sorted[sorted.length - 1] || "",
    });
  }

  async function saveData(nextData = data) {
    // prevent saving if manual ranking invalid
    if ((nextData.generalRankingMode || data.generalRankingMode) === "manual") {
      const err = validateManualRanking(nextData.generalRanking || data.generalRanking || []);
      if (err) {
        setMessage(err);
        return;
      }
    }

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData),
      credentials: "include",
    });
    setSaving(false);
    setMessage(response.ok ? "Cambios guardados." : "No se pudieron guardar los cambios.");
  }

  async function uploadImage(file, index) {
    if (!file) return;

    try {
      const body = await postImageFile(file);

      if (body?.url) {
        const gallery = updateArrayItem(data.gallery, index, { image: body.url });
        const nextData = { ...data, gallery };
        setData(nextData);
        await saveData(nextData);
      } else {
        setMessage(body.message || "No se pudo subir la imagen.");
      }
    } catch (err) {
      console.error("Upload image error:", err);
      setMessage(`Error al subir: ${err.message}`);
    }
  }

  async function uploadGalleryImages(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    try {
      const urls = [];
      for (const file of selected) {
        const body = await postImageFile(file);
        if (body?.url) urls.push(body.url);
      }

      if (urls.length) {
        const newPhotos = urls.map((url, index) => ({
          title: `Foto ${data.gallery.length + index + 1}`,
          caption: "Nueva foto de regata.",
          image: url,
        }));
        const nextData = { ...data, gallery: [...data.gallery, ...newPhotos] };
        setData(nextData);
        await saveData(nextData);
        setMessage(`Se subieron ${urls.length} fotos al archivo visual.`);
      } else {
        setMessage("No se pudieron subir las imágenes.");
      }
    } catch (err) {
      console.error("Upload gallery images error:", err);
      setMessage(`Error al subir: ${err.message}`);
    }
  }

  async function uploadChampionshipPhotos(files) {
    const selected = Array.from(files || []);
    if (!selected.length) return;

    try {
      const urls = [];
      for (const file of selected) {
        const body = await postImageFile(file);
        if (body?.url) urls.push(body.url);
      }

      if (urls.length) {
        const photos = [...(championship.photos || []), ...urls];
        const championships = updateArrayItem(data.championships, championshipIndex, { photos });
        const nextData = { ...data, championships };
        setData(nextData);
        await saveData(nextData);
        setMessage(`Se subieron ${urls.length} fotos al campeonato.`);
      } else {
        setMessage("No se pudieron subir las fotos del campeonato.");
      }
    } catch (err) {
      console.error("Upload championship photos error:", err);
      setMessage(`Error al subir: ${err.message}`);
    }
  }

  async function importDues(file) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/admin/dues-excel", { method: "POST", body: form, credentials: "include" });
    const body = await response.json();

    if (response.ok) {
      setData((current) => ({ ...current, dues: body.dues }));
      setMessage(`Excel importado: ${body.count} registros.`);
    } else {
      setMessage(body.message || "No se pudo importar el Excel.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    window.location.reload();
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/" aria-label="Volver al inicio">
          <span><img src="/stars-logo.svg" alt="" /></span>
          StarClass Admin
        </a>
        <nav className="admin-nav" aria-label="Secciones del administrador">
          <ul className="admin-nav-list">
            {adminSections.map((section) => (
              <li className="admin-nav-tab" key={section.id}>
                <button
                  type="button"
                  className={activeAdminSection === section.id ? "is-active" : ""}
                  onClick={() => openAdminSection(section.id)}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-header-actions">
          <a href="/" className="admin-header-button">
            <House size={18} />
            Inicio
          </a>
          <button type="button" onClick={logout} className="admin-header-button">
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </header>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p>Panel de control</p>
            <h2>{activeSection.label}</h2>
          </div>
          <button onClick={() => saveData()} disabled={saving}>
            <Save size={18} />
            {saving ? "Guardando..." : "Guardar todo"}
          </button>
        </header>

        {message ? <div className="admin-message">{message}</div> : null}

        <section className={activeAdminSection === "site-settings" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="site-settings">
          <div className="admin-section-title">
            <div>
              <span>Configuración</span>
              <h3>Ajustes del sitio</h3>
            </div>
          </div>
          <label>
            Texto de copyright
            <input value={data.copyright || ''} onChange={(event) => patchData({ copyright: event.target.value })} />
          </label>
          <div className="admin-section-title compact">
            <div>
              <span>Redes</span>
              <h3>Instagram</h3>
            </div>
          </div>
          <p className="admin-help">Editá los links de Instagram que se muestran en el sitio.</p>
          <div className="form-grid">
            {(Array.isArray(data.social?.instagram) ? data.social.instagram : data.social?.instagram ? [data.social.instagram] : []).map((item, idx) => (
              <div key={`social-${idx}`} className="social-row">
                <label>
                  Etiqueta
                  <input value={item?.label || ''} onChange={(e) => updateSocialItem(idx, { label: e.target.value })} />
                </label>
                <label>
                  URL
                  <input value={item?.url || ''} onChange={(e) => updateSocialItem(idx, { url: e.target.value })} />
                </label>
                <button type="button" className="danger" onClick={() => removeSocialItem(idx)}>
                  <Trash2 size={14} />
                  Borrar
                </button>
              </div>
            ))}
            <div>
              <button type="button" onClick={addSocialItem}>
                <Plus size={16} />
                Agregar Instagram
              </button>
            </div>
          </div>
        </section>

        <section className={activeAdminSection === "hero" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="hero">
          <div className="admin-section-title">
            <div>
              <span>Hero principal</span>
              <h3>Fotos del inicio</h3>
            </div>
            <div className="upload-actions">
              <button type="button" onClick={() => addGalleryToHero(3)}>
                <Plus size={18} />
                Desde galería
              </button>
              <button type="button" onClick={addChampionshipToHero}>
                <Plus size={18} />
                Desde campeonato
              </button>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir al hero
                <input type="file" accept="image/*" onChange={(event) => uploadHeroImage(event.target.files?.[0])} />
              </label>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir varias
                <input type="file" accept="image/*" multiple onChange={(event) => uploadHeroImages(event.target.files)} />
              </label>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir carpeta
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  directory=""
                  webkitdirectory=""
                  onChange={(event) => uploadHeroImages(event.target.files)}
                />
              </label>
            </div>
          </div>
          <p className="admin-help">
            Estas imágenes se guardan en <strong>starclass.json</strong> y se muestran en el carrusel del inicio. No dependen de carpetas locales.
          </p>
          <div className="photo-admin-grid">
            {normalizeHeroImages(data.hero?.images).map((url, index) => (
              <article key={`${url || "hero"}-${index}`}>
                {url ? <img src={url} alt="Hero" /> : <div className="empty-photo">Sin imagen</div>}
                <label>
                  URL de imagen
                  <input
                    value={url}
                    onChange={(event) =>
                      patchHero({
                        images: normalizeHeroImages(data.hero?.images).map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item,
                        ),
                      })
                    }
                  />
                </label>
                <label className="file-label">
                  Reemplazar archivo
                  <input type="file" accept="image/*" onChange={(event) => uploadHeroImage(event.target.files?.[0])} />
                </label>
                <button type="button" className="danger" onClick={() => removeHeroImage(index)}>
                  <Trash2 size={16} />
                  Borrar
                </button>
              </article>
            ))}
            <article>
              <div className="empty-photo">Nueva imagen</div>
              <button type="button" onClick={() => patchHero({ images: [...normalizeHeroImages(data.hero?.images), emptyHeroImage()] })}>
                <Plus size={18} />
                Agregar URL
              </button>
            </article>
          </div>
        </section>

        <section className={activeAdminSection === "sudamericano" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="sudamericano">
          <div className="admin-section-title">
            <div>
              <span>Página especial</span>
              <h3>Sudamericano</h3>
            </div>
            <a className="admin-header-button" href="/sudamericano" target="_blank" rel="noopener noreferrer">
              Ver página
            </a>
          </div>
          <p className="admin-help">
            Desde acá podés cambiar textos, imágenes y links de la página del Sudamericano sin tocar código.
          </p>

          <div className="form-grid three">
            <label>
              Etiqueta del hero
              <input value={sudamericano.heroKicker} onChange={(event) => patchSudamericano({ heroKicker: event.target.value })} />
            </label>
            <label>
              Título de tarjeta
              <input value={sudamericano.eventCardTitle} onChange={(event) => patchSudamericano({ eventCardTitle: event.target.value })} />
            </label>
            <label>
              Link YCA Darsena
              <input value={sudamericano.venueUrl} onChange={(event) => patchSudamericano({ venueUrl: event.target.value })} />
            </label>
          </div>
          <label>
            Título principal
            <textarea value={sudamericano.heroTitle} onChange={(event) => patchSudamericano({ heroTitle: event.target.value })} />
          </label>
          <label>
            Texto principal
            <textarea value={sudamericano.heroText} onChange={(event) => patchSudamericano({ heroText: event.target.value })} />
          </label>

          <div className="photo-admin-grid">
            {[
              { field: "heroImage", label: "Imagen hero", value: sudamericano.heroImage },
              { field: "venueImage", label: "Imagen edificio YCA", value: sudamericano.venueImage },
              { field: "splitImage", label: "Imagen barcos en agua", value: sudamericano.splitImage },
            ].map((item) => (
              <article key={item.field}>
                {item.value ? <img src={item.value} alt="" /> : <div className="empty-photo">Sin imagen</div>}
                <label>
                  {item.label}
                  <input value={item.value} onChange={(event) => patchSudamericano({ [item.field]: event.target.value })} />
                </label>
                <label className="file-label">
                  Subir imagen
                  <input type="file" accept="image/*" onChange={(event) => uploadSudamericanoImage(event.target.files?.[0], item.field)} />
                </label>
              </article>
            ))}
          </div>

          <div className="admin-section-title compact">
            <div>
              <span>Bloque informativo</span>
              <h3>Textos intermedios</h3>
            </div>
          </div>
          <div className="form-grid three">
            <label>
              Etiqueta
              <input value={sudamericano.infoEyebrow} onChange={(event) => patchSudamericano({ infoEyebrow: event.target.value })} />
            </label>
            <label>
              Título
              <input value={sudamericano.infoTitle} onChange={(event) => patchSudamericano({ infoTitle: event.target.value })} />
            </label>
            <label>
              Botón sede
              <input value={sudamericano.venueButtonLabel} onChange={(event) => patchSudamericano({ venueButtonLabel: event.target.value })} />
            </label>
          </div>
          <label>
            Texto
            <textarea value={sudamericano.infoText} onChange={(event) => patchSudamericano({ infoText: event.target.value })} />
          </label>

          <div className="admin-section-title compact">
            <div>
              <span>Sede</span>
              <h3>YCA Darsena Norte</h3>
            </div>
          </div>
          <div className="form-grid three">
            <label>
              Etiqueta sede
              <input value={sudamericano.venueKicker} onChange={(event) => patchSudamericano({ venueKicker: event.target.value })} />
            </label>
            <label>
              Crédito foto
              <input value={sudamericano.venueImageCredit} onChange={(event) => patchSudamericano({ venueImageCredit: event.target.value })} />
            </label>
            <label>
              Licencia foto
              <input value={sudamericano.venueImageLicense} onChange={(event) => patchSudamericano({ venueImageLicense: event.target.value })} />
            </label>
          </div>
          <label>
            Título sede
            <input value={sudamericano.venueTitle} onChange={(event) => patchSudamericano({ venueTitle: event.target.value })} />
          </label>
          <label>
            Texto sede
            <textarea value={sudamericano.venueText} onChange={(event) => patchSudamericano({ venueText: event.target.value })} />
          </label>
          <label>
            Fuente foto edificio
            <input value={sudamericano.venueImageSource} onChange={(event) => patchSudamericano({ venueImageSource: event.target.value })} />
          </label>

          <div className="admin-section-title compact">
            <div>
              <span>Expectativa</span>
              <h3>Bloque final</h3>
            </div>
          </div>
          <div className="form-grid three">
            <label>
              Etiqueta
              <input value={sudamericano.splitKicker} onChange={(event) => patchSudamericano({ splitKicker: event.target.value })} />
            </label>
            <label>
              Badge agua
              <input value={sudamericano.badgeWater} onChange={(event) => patchSudamericano({ badgeWater: event.target.value })} />
            </label>
            <label>
              Badge fecha
              <input value={sudamericano.badgeDate} onChange={(event) => patchSudamericano({ badgeDate: event.target.value })} />
            </label>
          </div>
          <label>
            Título expectativa
            <input value={sudamericano.splitTitle} onChange={(event) => patchSudamericano({ splitTitle: event.target.value })} />
          </label>
          <label>
            Texto expectativa
            <textarea value={sudamericano.splitText} onChange={(event) => patchSudamericano({ splitText: event.target.value })} />
          </label>
          <label>
            Badge sede
            <input value={sudamericano.badgeVenue} onChange={(event) => patchSudamericano({ badgeVenue: event.target.value })} />
          </label>
        </section>

        <section className={activeAdminSection === "posicionamiento" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="posicionamiento">
          <div className="admin-section-title">
            <div>
              <span>Ranking anual</span>
              <h3>Tabla de posicionamiento general</h3>
            </div>
          </div>
          <p className="admin-help">
            Elegí si la tabla se calcula automáticamente desde los campeonatos (Automático) o la editás manualmente (Manual).
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setGeneralMode('auto')} disabled={generalMode === 'auto'}>
              Automático
            </button>
            <button onClick={() => setGeneralMode('manual')} disabled={generalMode === 'manual'}>
              Manual
            </button>
          </div>

          {generalMode === 'auto' ? (
            <div>
              <p className="admin-help">La tabla se genera desde los campeonatos marcados como "Incluir en tabla general".</p>
              <GeneralRankingTable rows={generalRankingRows} championshipColumns={championshipColumns} />
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setGeneralMode('manual')}>Editar manualmente</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="admin-help">Editá las filas manualmente. Podés agregar, editar y eliminar timoneles aquí.</p>
              <div className="editable-table">
                <div
                  className="editable-row head"
                  style={{ gridTemplateColumns: `72px minmax(120px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) ${championshipColumns.map(() => "minmax(104px, 1fr)").join(" ")} 96px 48px`, minWidth: `${780 + championshipColumns.length * 130}px` }}
                >
                  <span>Pos.</span>
                  <span>Barco</span>
                  <span>Timón</span>
                  <span>Tripulante</span>
                  {championshipColumns.map((column) => (
                    <span key={column.key}>{column.label}</span>
                  ))}
                  <span>Total</span>
                  <span />
                </div>

                {(data.generalRanking || []).map((row, index) => (
                  <div className="editable-row" key={`${row.helm}-${index}`} style={{ gridTemplateColumns: `72px minmax(120px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) ${championshipColumns.map(() => "minmax(104px, 1fr)").join(" ")} 96px 48px`, minWidth: `${780 + championshipColumns.length * 130}px` }}>
                    <input type="number" value={row.position} onChange={(e) => patchGeneralRow(index, { position: Number(e.target.value) })} />
                    <input value={row.boat} onChange={(e) => patchGeneralRow(index, { boat: e.target.value })} />
                    <input value={row.helm} onChange={(e) => patchGeneralRow(index, { helm: e.target.value })} />
                    <input value={row.crew} onChange={(e) => patchGeneralRow(index, { crew: e.target.value })} />
                    {championshipColumns.map((column) => (
                      <input key={column.key} type="number" min="0" placeholder="N/A" value={row.championshipScores?.[column.key] ?? ''} onChange={(e) => {
                        const championshipScores = { ...(row.championshipScores || {}) };
                        if (e.target.value === '') delete championshipScores[column.key];
                        else championshipScores[column.key] = Number(e.target.value);
                        patchGeneralRow(index, { championshipScores });
                      }} />
                    ))}
                    <input
                      type="number"
                      className={invalidManualIndexes.has(index) ? 'invalid-input' : ''}
                      value={row.points ?? calculateGeneralRankingTotal(row, championshipColumns)}
                      onFocus={() => setEditingIndex(index)}
                      onBlur={() => {
                        setEditingIndex(null);
                        finalizeManualSort();
                      }}
                      onChange={(e) => {
                        const v = e.target.value === '' ? undefined : Number(e.target.value);
                        patchGeneralRow(index, { points: v });
                      }}
                    />
                    
                    
                    <button className="icon-button" onClick={() => removeGeneralRow(index)} aria-label="Borrar fila"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => addGeneralRow()}><Plus size={18} /> Agregar fila</button>
              </div>
            </div>
          )}
        </section>

        <section className={activeAdminSection === "campeonatos" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="campeonatos">
          <div className="admin-section-title">
            <div>
              <span>Resultados</span>
              <h3>Tabla por campeonato</h3>
            </div>
            <button
              onClick={() => {
                const championships = [...data.championships, emptyChampionship()];
                patchData({ championships });
                setChampionshipIndex(championships.length - 1);
              }}
            >
              <Plus size={18} />
              Campeonato
            </button>
            <button
              onClick={() => deleteChampionship(championshipIndex)}
              style={{ background: 'transparent', color: 'var(--red)', border: '1px solid rgba(173,75,69,0.12)' }}
            >
              <Trash2 size={18} />
              Eliminar
            </button>
            <button
              onClick={() => {
                const championships = [...data.championships].sort((a, b) => championshipTime(a) - championshipTime(b));
                patchData({ championships });
                setChampionshipIndex(0);
              }}
            >
              <CalendarDays size={18} />
              Ordenar por fecha
            </button>
          </div>

          <label>
            Campeonato
            <select value={championshipIndex} onChange={(event) => setChampionshipIndex(Number(event.target.value))}>
              {data.championships.map((item, index) => (
                <option key={`${item.name}-${index}`} value={index}>{item.name}</option>
              ))}
            </select>
          </label>

          <div className="form-grid three">
            <label>Nombre<input value={championship.name} onChange={(event) => patchChampionship({ name: event.target.value })} /></label>
            <label>Texto de fecha<input value={championship.date} onChange={(event) => patchChampionship({ date: event.target.value })} /></label>
            <label>Lugar<input value={championship.location} onChange={(event) => patchChampionship({ location: event.target.value })} /></label>
          </div>
          <label>
            Link del campeonato
            <input
              value={championship.link || ""}
              placeholder="https://... o /campeonatos/..."
              onChange={(event) => patchChampionship({ link: event.target.value })}
            />
          </label>
          <div className="admin-calendar-layout">
            <DateCalendar
              label="Fecha inicio"
              value={championship.startDate || ""}
              helper="Elegir cuando empieza el campeonato."
              onSelect={(startDate) => patchChampionship({ startDate })}
            />
            <DateCalendar
              label="Fecha fin"
              value={championship.endDate || ""}
              helper="Elegir cuando termina el campeonato."
              onSelect={(endDate) => patchChampionship({ endDate })}
            />
          </div>
          <p className="admin-help">Estas fechas ordenan los campeonatos y definen si van a próximas fechas o a último campeonato.</p>
          <div className="race-dates-editor">
            <div className="admin-section-title compact">
              <div>
                <span>Días de regata</span>
                <h3>Elegir días que se corre</h3>
              </div>
            </div>
            <label>
              Cantidad de regatas del campeonato
              <input
                type="number"
                min="0"
                value={getRaceCount()}
                onChange={(event) => setRaceCount(event.target.value)}
              />
            </label>
            <label>
              Cantidad de descartes
              <input
                type="number"
                min="0"
                value={championship?.discardCount || 0}
                onChange={(event) => setDiscardCount(event.target.value)}
              />
            </label>
            <DateCalendar
              label="Calendario de regatas"
              mode="multiple"
              selectedDates={championship.raceDates || []}
              helper="Toca un dia para agregarlo o quitarlo."
              onSelect={toggleRaceDate}
            />
            <div className="selected-race-dates">
              {(championship.raceDates || []).length ? (
                (championship.raceDates || []).map((date, index) => (
                  <button className="race-date-chip" type="button" key={`${date}-${index}`} onClick={() => removeRaceDate(index)}>
                    {formatAdminDate(date)}
                    <Trash2 size={14} />
                  </button>
                ))
              ) : (
                <span>No hay dias de regata elegidos.</span>
              )}
            </div>
          </div>
          <label>Resumen<textarea value={championship.summary} onChange={(event) => patchChampionship({ summary: event.target.value })} /></label>
          <label>
            Carpeta de fotos asociada
            <input
              value={championship.photoFolder || ""}
              placeholder="Ej: San isidro labrador/Fotos SIL"
              onChange={(event) => patchChampionship({ photoFolder: event.target.value })}
            />
          </label>

          <label>
            <input
              type="checkbox"
              checked={championship.includeInGeneral !== false}
              onChange={(e) => patchChampionship({ includeInGeneral: e.target.checked })}
            />
            Incluir en tabla general
          </label>

          <div className="championship-photo-tools">
            <div>
              <strong>Fotos del campeonato</strong>
              <span>{(championship.photos || []).length} fotos subidas desde admin</span>
            </div>
            <div className="upload-actions">
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir fotos
                <input type="file" accept="image/*" multiple onChange={(event) => uploadChampionshipPhotos(event.target.files)} />
              </label>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir carpeta
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  directory=""
                  webkitdirectory=""
                  onChange={(event) => uploadChampionshipPhotos(event.target.files)}
                />
              </label>
            </div>
          </div>

          {(championship.photos || []).length ? (
            <div className="championship-photo-strip">
              {(championship.photos || []).map((photo, index) => (
                <figure key={`${photo}-${index}`}>
                  <img src={photo} alt="" />
                  <button
                    className="icon-button"
                    aria-label="Borrar foto del campeonato"
                    onClick={() => patchChampionship({ photos: championship.photos.filter((_, photoIndex) => photoIndex !== index) })}
                  >
                    <Trash2 size={16} />
                  </button>
                </figure>
              ))}
            </div>
          ) : null}

          <div className="editable-table">
            <div className="editable-row head" style={{ gridTemplateColumns: `72px minmax(120px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) ${Array.from({ length: getRaceCount() }).map(() => "80px").join(" ")} 96px 48px`, minWidth: `${680 + getRaceCount() * 90}px` }}>
              <span>Pos.</span><span>Barco</span><span>Timón</span><span>Tripulante</span>
              {Array.from({ length: getRaceCount() }).map((_, raceIndex) => (
                <span key={`race-head-${raceIndex}`}>R{raceIndex + 1}</span>
              ))}
              <span>Puntos</span><span></span>
            </div>
            {championship.results.map((row, index) => (
              <div className="editable-row" key={index} style={{ gridTemplateColumns: `72px minmax(120px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) ${Array.from({ length: getRaceCount() }).map(() => "80px").join(" ")} 96px 48px`, minWidth: `${680 + getRaceCount() * 90}px` }}>
                <input type="number" value={row.position} onChange={(event) => patchResult(index, { position: Number(event.target.value) })} />
                <input value={row.boat} onChange={(event) => patchResult(index, { boat: event.target.value })} />
                <input value={row.helm} onChange={(event) => patchResult(index, { helm: event.target.value })} />
                <input value={row.crew} onChange={(event) => patchResult(index, { crew: event.target.value })} />
                {Array.from({ length: getRaceCount() }).map((_, raceIndex) => (
                  <input
                    key={`race-${index}-${raceIndex}`}
                    value={Array.isArray(row.races) ? (row.races[raceIndex] ?? "") : ""}
                    placeholder={`R${raceIndex + 1}`}
                    onChange={(event) => patchResultRaceValue(index, raceIndex, event.target.value)}
                  />
                ))}
                <input type="number" value={getChampionshipResultScore(row, championship?.discardCount || 0)} readOnly title="Se calcula automáticamente sumando todas las regatas" />
                <button
                  className="icon-button"
                  onClick={() => patchChampionship({ results: championship.results.filter((_, rowIndex) => rowIndex !== index) })}
                  aria-label="Borrar fila"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => {
            const races = Array.from({ length: getRaceCount() }, () => "");
            const next = { ...emptyResult(championship.results.length + 1), races };
            patchChampionship({ results: [...championship.results, next] });
          }}>
            <Plus size={18} />
            Agregar fila
          </button>
        </section>

        <section className={activeAdminSection === "galeria" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="galeria">
          <div className="admin-section-title">
            <div>
              <span>Archivo visual</span>
              <h3>Fotos de regatas</h3>
            </div>
            <div className="upload-actions">
              <button onClick={() => patchData({ gallery: [...data.gallery, emptyGallery()] })}>
                <Plus size={18} />
                Foto
              </button>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir varias
                <input type="file" accept="image/*" multiple onChange={(event) => uploadGalleryImages(event.target.files)} />
              </label>
              <label className="upload-button">
                <ImagePlus size={18} />
                Subir carpeta
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  directory=""
                  webkitdirectory=""
                  onChange={(event) => uploadGalleryImages(event.target.files)}
                />
              </label>
            </div>
          </div>
          <div className="photo-admin-grid">
            {data.gallery.map((photo, index) => (
              <article key={index}>
                {photo.image ? <img src={photo.image} alt="" /> : <div className="empty-photo">Sin imagen</div>}
                <label>Título<input value={photo.title} onChange={(event) => patchData({ gallery: updateArrayItem(data.gallery, index, { title: event.target.value }) })} /></label>
                <label>Texto<input value={photo.caption} onChange={(event) => patchData({ gallery: updateArrayItem(data.gallery, index, { caption: event.target.value }) })} /></label>
                <label>URL de imagen<input value={photo.image} onChange={(event) => patchData({ gallery: updateArrayItem(data.gallery, index, { image: event.target.value }) })} /></label>
                <label className="file-label">
                  Subir imagen
                  <input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0], index)} />
                </label>
                <button className="danger" onClick={() => patchData({ gallery: data.gallery.filter((_, photoIndex) => photoIndex !== index) })}>
                  <Trash2 size={16} />
                  Borrar
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className={activeAdminSection === "dues" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="dues">
          <div className="admin-section-title">
            <div>
              <span>{paidSummary}</span>
              <h3>Tabla de Dues</h3>
            </div>
            <div className="upload-actions">
              <button type="button" onClick={() => patchData({ dues: [...data.dues, emptyDuesRow()] })}>
                <Plus size={18} />
                Agregar fila
              </button>
              <label className="upload-button">
                <Sheet size={18} />
                Importar Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => importDues(event.target.files?.[0])} />
              </label>
            </div>
          </div>
          <p className="admin-help">Editá Barco, Propietario, Flota, Tripulante, Dues Timonel, Dues Tripulantes y FAY. Guardá con el botón superior.</p>
          <div className="dues-admin-table">
            <div className="dues-admin-row head">
              <span>Barco</span>
              <span>Propietario</span>
              <span>Flota</span>
              <span>Tripulante</span>
              <span>Dues Timonel</span>
              <span>Dues Tripulantes</span>
              <span>FAY</span>
              <span></span>
            </div>
            {(data.dues || []).map((dues, index) => (
              <div className="dues-admin-row" key={index}>
                <input value={dues.boat || ""} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { boat: event.target.value }) })} />
                <input value={dues.owner || ""} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { owner: event.target.value }) })} />
                <input value={dues.fleet || ""} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { fleet: event.target.value }) })} />
                <input value={dues.crew || ""} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { crew: event.target.value }) })} />
                <select value={dues.helmDues || dues.status || "Pendiente"} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { helmDues: event.target.value }) })}>
                  <option>Pendiente</option>
                  <option>Activo</option>
                  <option>Life</option>
                </select>
                <select value={dues.crewDues || "Pendiente"} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { crewDues: event.target.value }) })}>
                  <option>Pendiente</option>
                  <option>Activo</option>
                  <option>Life</option>
                </select>
                <select value={dues.fay || "No"} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { fay: event.target.value }) })}>
                  <option>Si</option>
                  <option>No</option>
                </select>
                <button type="button" className="icon-button" onClick={() => patchData({ dues: data.dues.filter((_, rowIndex) => rowIndex !== index) })} aria-label="Borrar fila">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className={activeAdminSection === "calendario" ? "admin-section admin-section-active" : "admin-section admin-section-hidden"} id="calendario">
          <div className="admin-section-title">
            <div>
              <span>Regatas</span>
              <h3>Calendario</h3>
            </div>
            <button onClick={() => patchData({ events: [...data.events, emptyEvent()] })}>
              <Plus size={18} />
              Competencia
            </button>
          </div>
          <div className="event-admin-list">
            {data.events.map((event, index) => (
              <div className="form-grid event-edit" key={index}>
                <input value={event.title} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { title: e.target.value }) })} />
                <input value={event.type} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { type: e.target.value }) })} />
                <input value={event.club} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { club: e.target.value }) })} />
                <input value={event.location} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { location: e.target.value }) })} />
                <input type="date" value={event.start} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { start: e.target.value }) })} />
                <input type="date" value={event.end} onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { end: e.target.value }) })} />
                <input value={event.link || ""} placeholder="Link" onChange={(e) => patchData({ events: updateArrayItem(data.events, index, { link: e.target.value }) })} />
                <button
                  className="danger"
                  type="button"
                  onClick={() => patchData({ events: data.events.filter((_, eventIndex) => eventIndex !== index) })}
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
