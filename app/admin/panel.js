"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  House,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Sheet,
  Trash2,
  Trophy,
} from "lucide-react";
import DateCalendar, { formatAdminDate } from "../../components/ui/date-calendar";
import {
  buildChampionshipColumns,
  buildGeneralRankingData,
  calculateGeneralRankingTotal,
  getChampionshipResultScore,
} from "../../lib/general-ranking";
import { GeneralRankingTable } from "../../components/ui/general-ranking";

function emptyResult(position = 1) {
  return { position, boat: "", helm: "", crew: "", score: 0, races: [] };
}

function emptyGallery() {
  return { title: "Nueva foto", caption: "", image: "" };
}

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

async function compressImageFile(file) {
  if (!file?.type?.startsWith("image/")) return file;

  const smallEnough = file.size <= 2.5 * 1024 * 1024 && /image\/(jpeg|jpg|webp)/i.test(file.type);
  if (smallEnough) return file;

  const maxSize = 1600;
  let bitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const ratio = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function postImageFile(file) {
  const optimized = await compressImageFile(file);
  const form = new FormData();
  form.append("file", optimized);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  let body;
  try {
    body = await response.json();
  } catch (parseErr) {
    console.error("Error parsing JSON response:", parseErr, response.status);
    throw new Error(`respuesta inválida del servidor (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(body.message || `error ${response.status}`);
  }

  return body;
}

export default function AdminPanel({ initialData }) {
  const [data, setData] = useState(initialData);
  const [championshipIndex, setChampionshipIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generalValidationError, setGeneralValidationError] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

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

  const paidSummary = useMemo(() => {
    const paid = data.dues.filter((dues) => dues.status === "Pago").length;
    return `${paid}/${data.dues.length} pagos`;
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
      <aside className="admin-sidebar">
        <div>
          <span>StarClass</span>
          <h1>Administrador</h1>
        </div>
        <nav>
          <a href="#posicionamiento"><Trophy size={18} /> General</a>
          <a href="#campeonatos"><Trophy size={18} /> Campeonatos</a>
          <a href="#galeria"><ImagePlus size={18} /> Fotos</a>
          <a href="#dues"><Sheet size={18} /> Dues</a>
          <a href="#calendario"><CalendarDays size={18} /> Calendario</a>
        </nav>
        <button onClick={logout} className="sidebar-button">
          <LogOut size={18} />
          Salir
        </button>
        <a href="/" className="sidebar-button" style={{ marginTop: 8 }}>
          <House size={18} />
          Volver al inicio
        </a>
      </aside>

      <section className="admin-content">
        <header className="admin-topbar">
          <div>
            <p>Panel de control</p>
            <h2>Contenido de la web</h2>
          </div>
          <button onClick={() => saveData()} disabled={saving}>
            <Save size={18} />
            {saving ? "Guardando..." : "Guardar todo"}
          </button>
        </header>

        {message ? <div className="admin-message">{message}</div> : null}

        <section className="admin-section" id="site-settings">
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
        </section>

        <section className="admin-section" id="posicionamiento">
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

        <section className="admin-section" id="campeonatos">
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

        <section className="admin-section" id="galeria">
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

        <section className="admin-section" id="dues">
          <div className="admin-section-title">
            <div>
              <span>{paidSummary}</span>
              <h3>Pagos de Dues desde Excel</h3>
            </div>
            <label className="upload-button">
              <Sheet size={18} />
              Importar Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => importDues(event.target.files?.[0])} />
            </label>
          </div>
          <p className="admin-help">El Excel puede tener columnas como Barco, Propietario y Pago/Dues/Estado.</p>
          <div className="dues-admin-list">
            {data.dues.map((dues, index) => (
              <div className="dues-admin-row" key={index}>
                <input value={dues.boat} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { boat: event.target.value }) })} />
                <input value={dues.owner} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { owner: event.target.value }) })} />
                <select value={dues.status} onChange={(event) => patchData({ dues: updateArrayItem(data.dues, index, { status: event.target.value }) })}>
                  <option>Pago</option>
                  <option>Pendiente</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section" id="calendario">
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
