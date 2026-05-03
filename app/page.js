import {
  Anchor,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Instagram,
  Medal,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { readStarclassData } from "../lib/starclass-data";
import {
  buildGeneralRankingData,
} from "../lib/general-ranking";
import { listHeroImages } from "../lib/hero-images";
import { championshipSlug } from "../lib/slug";
import HeroCarousel from "../components/ui/hero-carousel";
import NavHeader from "../components/ui/nav-header";
import { GeneralRankingPreview } from "../components/ui/general-ranking";

export const dynamic = "force-dynamic";

const formatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parseDate(date) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  return formatter.format(new Date(`${date}T12:00:00`)).replace(".", "");
}

function formatDateRange(start, end, fallback = "") {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate && endDate) {
    return `${longDateFormatter.format(startDate).replace(".", "")} - ${longDateFormatter.format(endDate).replace(".", "")}`;
  }

  if (startDate) {
    return longDateFormatter.format(startDate).replace(".", "");
  }

  return fallback;
}

function formatRaceDates(item) {
  const raceDates = (item.raceDates || []).map(parseDate).filter(Boolean);

  if (raceDates.length) {
    return raceDates
      .sort((a, b) => a.getTime() - b.getTime())
      .map((date) => longDateFormatter.format(date).replace(".", ""))
      .join(" · ");
  }

  return formatDateRange(item.startDate, item.endDate, item.date);
}

function getComparableDate(item, field = "startDate") {
  const raceDates = (item.raceDates || []).map(parseDate).filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  return (raceDates[0] || parseDate(item[field] || item.start || item.endDate || item.end))?.getTime() || Number.MAX_SAFE_INTEGER;
}

function getEndDate(item) {
  const raceDates = (item.raceDates || []).map(parseDate).filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  return raceDates[raceDates.length - 1] || parseDate(item.endDate || item.end || item.startDate || item.start);
}

function getStartDate(item) {
  const raceDates = (item.raceDates || []).map(parseDate).filter(Boolean).sort((a, b) => a.getTime() - b.getTime());
  return raceDates[0] || parseDate(item.startDate || item.start || item.endDate || item.end);
}

function getLatestRanChampionship(championships, today) {
  return championships
    .filter((championship) => {
      const startDate = getStartDate(championship);
      const endDate = getEndDate(championship);

      return startDate && endDate && startDate <= today;
    })
    .sort((a, b) => {
      const aEnd = getEndDate(a)?.getTime() || 0;
      const bEnd = getEndDate(b)?.getTime() || 0;
      const endDateDistance = Math.abs(aEnd - today.getTime()) - Math.abs(bEnd - today.getTime());

      if (endDateDistance !== 0) {
        return endDateDistance;
      }

      return (getStartDate(b)?.getTime() || 0) - (getStartDate(a)?.getTime() || 0);
    })[0] || null;
}

function isUpcomingCompetition(item, today) {
  const startDate = getStartDate(item);
  const endDate = getEndDate(item);

  return startDate && startDate >= today && (!endDate || endDate >= today);
}

function isExternalLink(link) {
  return /^https?:\/\//i.test(link || "");
}

function getEventTypeClass(type) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("major")) return "event-card-major";
  if (normalized.includes("entrenamiento")) return "event-card-training";
  if (normalized.includes("internacional")) return "event-card-international";
  return "event-card-national";
}

function EventCard({ event }) {
  const className = `event-card ${getEventTypeClass(event.type)}${event.link ? " event-card-link" : ""}`;
  const hasLink = Boolean(event.link);
  const content = (
    <>
      <div className="event-date">
        <span>{formatDate(event.start)}</span>
        <small>{formatDate(event.end)}</small>
      </div>
      <div>
        <p>{event.type}</p>
        <h3>{event.title}</h3>
        <span>{event.club}{" · "}{event.location}</span>
        {hasLink ? <span className="button ghost event-register-link">Inscribirse</span> : null}
      </div>
    </>
  );

  if (!event.link) {
    return <article className={className}>{content}</article>;
  }

  return (
    <a
      className={className}
      href={event.link}
      target={isExternalLink(event.link) ? "_blank" : undefined}
      rel={isExternalLink(event.link) ? "noopener noreferrer" : undefined}
    >
      {content}
    </a>
  );
}

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export default async function Home() {
  const data = await readStarclassData();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const folderImages = await listHeroImages();
  const sortedChampionships = [...data.championships].sort((a, b) => getComparableDate(a) - getComparableDate(b));
  const futureChampionships = data.championships.filter((championship) => {
    return isUpcomingCompetition(championship, today);
  });
  const latest = getLatestRanChampionship(data.championships, today);
    const upcomingEvents = [
    ...data.events.map((event) => ({ ...event, source: "event" })),
    ...futureChampionships.map((championship) => ({
      title: championship.name,
      type: "Campeonato",
      club: championship.location,
      location: championship.location,
      start: championship.raceDates?.[0] || championship.startDate,
      end: championship.raceDates?.[championship.raceDates.length - 1] || championship.endDate,
      raceDates: championship.raceDates,
        link: championship.link || (championship.name && championship.name.toLowerCase().includes("sudamericano") ? "/sudamericano" : `/campeonatos/${championshipSlug(championship, sortedChampionships.indexOf(championship))}`),
      source: "championship",
    })),
  ]
    .filter((event) => {
      return isUpcomingCompetition(event, today);
    })
    .sort((a, b) => getComparableDate(a, "start") - getComparableDate(b, "start"));
  const heroImages =
    (data.hero?.images || []).filter(Boolean).length
      ? [...new Set((data.hero.images || []).filter(Boolean))]
      : folderImages.length
        ? folderImages
        : [data.hero.image, ...data.gallery.map((item) => item.image)].filter(Boolean);
  const { rows: generalRankingRows } = buildGeneralRankingData(data.championships);
  const visualGallery = data.gallery;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="StarClass Argentina">
          <span><img src="/stars-logo.svg" alt="" /></span>
          StarClass Argentina
        </a>
        <NavHeader />
      </header>

      <section className="hero" id="inicio">
        <HeroCarousel images={heroImages} />
        <div className="hero-content">
          <p className="kicker">Clase Star Argentina</p>
          <h1>Regatas, flotas y resultados de la Clase Star.</h1>
          <p>
            Un espacio simple para seguir el calendario, ver fotos de regatas,
            consultar rankings y mantener ordenada la informacion de la flota.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#calendario">
              <CalendarDays size={18} />
              Ver calendario
            </a>
            <a className="button ghost" href={data.social.instagram.url} target="_blank">
              <Instagram size={18} />
              Instagram
            </a>
            <a className="button ghost" href="https://www.starclass.org/" target="_blank">
              <Anchor size={18} />
              ISCYRA
            </a>
          </div>
        </div>
      </section>

      <section className="section calendar-section" id="calendario">
        <SectionHeader eyebrow="Temporada 2026" title="Proximas Campeonatos">
          Proximas fechas de regatas nacionales y campeonatos destacados. Los campeonatos ya corridos no aparecen aca!.
        </SectionHeader>
        <div className="event-grid">
          {upcomingEvents.map((event) => (
            <EventCard event={event} key={event.title} />
          ))}
        </div>
      </section>

      <section className="section latest-section" id="resultados">
        <SectionHeader eyebrow="Ultimo campeonato" title="Ultimo campeonato corrido">
          Acceso directo a la tabla completa, fotos y detalle del campeonato mas reciente.
        </SectionHeader>
        {latest ? (
          <a className="latest-championship-card" href={`/campeonatos/${championshipSlug(latest, sortedChampionships.indexOf(latest))}`}>
            <div className="latest-championship-media" aria-hidden="true">
              <img src={latest.photos?.[0] || visualGallery[0]?.image || data.hero.image} alt="" />
            </div>
            <div className="latest-championship-content">
              <Trophy size={28} />
              <span>{latest.location}</span>
              <h3>{latest.name}</h3>
              <p className="latest-date">{formatRaceDates(latest)}</p>
              <p>{latest.summary}</p>
              <strong>
                Ver tabla y fotos
                <ArrowRight size={18} />
              </strong>
            </div>
          </a>
        ) : (
          <div className="latest-championship-card latest-empty">
            <div className="latest-championship-content">
              <Trophy size={28} />
              <h3>Aun no hay campeonatos corridos</h3>
              <p>Cuando haya uno cerrado con fecha menor o igual a hoy, se mostrará acá automáticamente.</p>
            </div>
          </div>
        )}
      </section>

      <section className="section" id="fotos">
        <SectionHeader eyebrow="Archivo visual" title="Fotos de regatas">
          Galeria inicial para mostrar actividad en el agua, podios y vida de flota.
        </SectionHeader>
        <div className="gallery">
          {visualGallery.map((item) => (
            <figure key={item.title}>
              <img src={item.image} alt={item.title} />
              <figcaption>
                <strong>{item.title}</strong>
                <span>{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="section split" id="rankings">
        <div>
          <SectionHeader eyebrow="Anual" title="Tabla de posicionamiento general">
            Solo aparecen los 3 primeros de la general. Participan quienes corrieron todos los campeonatos incluidos o faltaron como máximo a uno.
          </SectionHeader>
          <GeneralRankingPreview rows={generalRankingRows} href="/posicionamiento" />
        </div>
        <div>
          <SectionHeader eyebrow="Campeonatos" title="Tablas por campeonato">
            Acceso rapido a cada campeonato cargado.
          </SectionHeader>
          <div className="championship-list">
            {sortedChampionships.map((championship, index) => (
              <a className="championship-link" href={`/campeonatos/${championshipSlug(championship, index)}`} key={`${championship.name}-${index}`}>
                <Medal size={20} />
                <div>
                  <h3>{championship.name}</h3>
                  <p>{formatRaceDates(championship)} · {championship.location}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section dues-section" id="comunidad">
        <div>
          <SectionHeader eyebrow="Administración" title="Pagos de Dues">
            Estado visible para ordenar la informacion de la flota.
          </SectionHeader>
          <div className="dues-grid">
            {data.dues.map((dues) => (
              <article className={dues.status === "Pago" ? "dues paid" : "dues pending"} key={dues.boat}>
                {dues.status === "Pago" ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
                <div>
                  <strong>{dues.boat}</strong>
                  <span>{dues.owner}</span>
                </div>
                <em>{dues.status}</em>
              </article>
            ))}
          </div>
        </div>
        <aside className="social-card">
          <Anchor size={26} />
          <h2>Comunidad y redes</h2>
          <p>Links oficiales para difundir regatas, fotos y novedades.</p>
          <a href={data.social.instagram.url} target="_blank">
            <Instagram size={18} />
            {data.social.instagram.label}
            <ExternalLink size={16} />
          </a>
        </aside>
      </section>
    </main>
  );
}

