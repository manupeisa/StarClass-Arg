import { ArrowLeft, CalendarDays, MapPin, Trophy } from "lucide-react";
import { notFound } from "next/navigation";
import { listPhotosFromFolder } from "../../../lib/hero-images";
import { getChampionshipResultScore } from "../../../lib/general-ranking";
import { championshipSlug } from "../../../lib/slug";
import { readStarclassData } from "../../../lib/starclass-data";
import HeroCarousel from "../../../components/ui/hero-carousel";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parseDate(date) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateRange(start, end, fallback = "") {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate && endDate) {
    return `${dateFormatter.format(startDate).replace(".", "")} - ${dateFormatter.format(endDate).replace(".", "")}`;
  }

  if (startDate) {
    return dateFormatter.format(startDate).replace(".", "");
  }

  return fallback;
}

function formatRaceDates(item) {
  const raceDates = (item.raceDates || []).map(parseDate).filter(Boolean);

  if (raceDates.length) {
    return raceDates
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => dateFormatter.format(date).replace(".", ""))
      .join(" · ");
  }

  return formatDateRange(item.startDate, item.endDate, item.date);
}

function RankingTable({ rows, raceDates = [], raceCount = 0, discardCount = 0 }) {
  function getRaceValue(row, idx) {
    // Prefer structured `races` array, then common key patterns, otherwise empty
    if (Array.isArray(row.races) && idx < row.races.length) return row.races[idx];
    if (row[`r${idx + 1}`] !== undefined) return row[`r${idx + 1}`];
    if (row[`race${idx + 1}`] !== undefined) return row[`race${idx + 1}`];
    if (row[`race_${idx + 1}`] !== undefined) return row[`race_${idx + 1}`];
    return row.score !== undefined && Math.max(raceDates.length, raceCount) <= 1 ? row.score : null;
  }

  const maxRowsRaceCount = Math.max(0, ...rows.map((row) => (Array.isArray(row.races) ? row.races.length : 0)));
  const totalRaceColumns = Math.max(Number(raceCount) || 0, raceDates.length, maxRowsRaceCount);
  const raceIndexes = Array.from({ length: totalRaceColumns }, (_, index) => index);

  return (
    <div className="table-wrap">
      <table style={{ minWidth: `${560 + totalRaceColumns * 80}px` }}>
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Barco</th>
            <th>Timón</th>
            <th>Tripulante</th>
            {raceIndexes.map((i) => (
              <th key={`race-${i}`}>{`R${i + 1}`}</th>
            ))}
            <th>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            // Ensure rows are shown ordered by computed championship score (ascending: lower points first)
            const mapped = (rows || []).map((r) => ({ r, score: getChampionshipResultScore(r, discardCount) }));
            mapped.sort((a, b) => a.score - b.score);
            return mapped.map(({ r: row }) => {
            // Build numeric races array and determine discarded indices (highest scores are worst)
            const numericRaces = Array.from({ length: totalRaceColumns }).map((_, idx) => {
              const raw = getRaceValue(row, idx);
              const n = raw == null || raw === "" ? null : Number(raw);
              return Number.isFinite(n) ? { idx, val: n } : null;
            }).filter(Boolean);

            const discardedSet = new Set();
            if (discardCount > 0 && numericRaces.length) {
              const sortedDesc = [...numericRaces].sort((a, b) => b.val - a.val);
              sortedDesc.slice(0, discardCount).forEach((item) => discardedSet.add(item.idx));
            }

            return (
              <tr key={`${row.position}-${row.boat}-${row.helm}`}>
                <td>{/* position computed from ordering */}{mapped.indexOf(mapped.find(m => m.r === row)) + 1}</td>
                <td>{row.boat}</td>
                <td>{row.helm}</td>
                <td>{row.crew}</td>
                {raceIndexes.map((i) => {
                  const v = getRaceValue(row, i);
                  const display = v == null || v === "" ? "-" : (discardedSet.has(i) ? `(${v})` : v);
                  return <td key={`${row.boat}-${i}`}>{display}</td>;
                })}
                <td>{getChampionshipResultScore(row, discardCount)}</td>
              </tr>
            );
          });
        })()}
        </tbody>
      </table>
    </div>
  );
}

export default async function ChampionshipPage({ params }) {
  const data = await readStarclassData();
  const index = data.championships.findIndex((item, itemIndex) => championshipSlug(item, itemIndex) === params.slug);
  const championship = data.championships[index];

  if (!championship) {
    notFound();
  }

  const folderPhotos = await listPhotosFromFolder(championship.photoFolder);
  const photos = [
    ...(championship.photos || []).map((url, photoIndex) => ({
      url,
      name: `Foto ${photoIndex + 1}`,
    })),
    ...folderPhotos,
  ];
  const visiblePhotos = photos.slice(0, 24);
  const heroPhotos = photos.map((photo) => photo.url);
  const dateLabel = formatRaceDates(championship);

  return (
    <main>
      <header className="championship-hero">
        <HeroCarousel images={heroPhotos} />
        <a className="back-link championship-back-link" href="/#rankings">
          <ArrowLeft size={18} />
          Volver
        </a>
        <p className="kicker">Campeonato</p>
        <h1>{championship.name}</h1>
        <div className="championship-meta">
          <span><CalendarDays size={18} /> {dateLabel}</span>
          <span><MapPin size={18} /> {championship.location}</span>
        </div>
        {championship.summary ? <p>{championship.summary}</p> : null}
      </header>

      <section className="section championship-detail-section">
        <div>
          <div className="section-header">
            <span>Resultados</span>
            <h2>Tabla de posiciones</h2>
          </div>
          <RankingTable
            rows={championship.results || []}
            raceDates={(championship.raceDates || []).slice().sort()}
            raceCount={championship.raceCount || 0}
            discardCount={championship.discardCount || 0}
          />
        </div>

        <aside className="championship-detail-card">
          <Trophy size={28} />
          <strong>{championship.results?.length || 0}</strong>
          <span>barcos clasificados</span>
        </aside>
      </section>

      {visiblePhotos.length ? (
        <section className="section championship-photo-section">
          <div className="section-header">
            <span>Fotos</span>
            <h2>Archivo del campeonato</h2>
            <p>Imágenes servidas desde los archivos originales para conservar la mayor calidad posible.</p>
          </div>
          <div className="championship-public-gallery">
            {visiblePhotos.map((photo, photoIndex) => (
              <figure key={`${photo.url}-${photoIndex}`}>
                <img src={photo.url} alt={photo.name || championship.name} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

