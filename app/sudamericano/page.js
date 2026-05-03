import {
  Anchor,
  CalendarDays,
  ChevronRight,
  Clock,
  MapPin,
  Sailboat,
  Trophy,
  Waves,
} from "lucide-react";
import NavHeader from "../../components/ui/nav-header";
import { readStarclassData } from "../../lib/starclass-data";

export const dynamic = "force-dynamic";

const pageNavItems = [
  { label: "Home", href: "/" },
  { label: "Calendario", href: "/#calendario" },
  { label: "Resultados", href: "/#resultados" },
  { label: "Fotos", href: "/#fotos" },
  { label: "Major", href: "/posicionamiento" },
  { label: "Sudamericano", href: "/sudamericano" },
  { label: "Comunidad", href: "/#comunidad" },
];

const ycaLocationUrl = "https://yca.org.ar/event-location/sede-darsena-norte/";
const ycaBuildingSource =
  "https://commons.wikimedia.org/wiki/File:Predio_del_Yacht_Club_de_Buenos_Aires,_Edificio_del_Yacht_Club.jpg";
const ycaBuildingLicense = "https://creativecommons.org/licenses/by-sa/3.0/";

const defaultSudamericano = {
  heroKicker: "Campeonato Sudamericano de StarClass",
  heroTitle: "Un nuevo evento de la clase con todos los condimentos que ofrece Buenos Aires.",
  heroText:
    "Cuatro dias para reunir talento, tradicion y competencia de alto nivel en la clase Star. La cuenta regresiva ya empezo.",
  heroImage: "",
  venueUrl: ycaLocationUrl,
  eventCardTitle: "",
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
  venueImageSource: ycaBuildingSource,
  venueImageLicense: ycaBuildingLicense,
  splitKicker: "Expectativa",
  splitTitle: "Una cita regional con identidad de flota.",
  splitText:
    "La Darsena prepara un escenario ideal para recibir a timoneles y tripulantes de la region. El campeonato combina intensidad deportiva, comunidad y el valor historico de una clase que sigue convocando a los mejores navegantes.",
  splitImage: "/uploads/flo-8042-copia-1777585686571.jpg",
  badgeWater: "Rio de la Plata",
  badgeDate: "Diciembre 2026",
  badgeVenue: "YCA Darsena",
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
});

function parseDate(date) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateRange(start, end) {
  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (startDate && endDate) {
    if (
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear()
    ) {
      return `${dayFormatter.format(startDate)} al ${dateFormatter.format(endDate)}`;
    }

    return `${dateFormatter.format(startDate)} al ${dateFormatter.format(endDate)}`;
  }

  return startDate ? dateFormatter.format(startDate) : "Fecha a confirmar";
}

export default async function SudamericanoPage() {
  const data = await readStarclassData();
  const event = data.events.find((item) => item.title?.toLowerCase().includes("sudamericano")) || {
    title: "Sudamericano 2026",
    club: "YCA Darsena",
    location: "YCA Darsena",
    start: "2026-12-05",
    end: "2026-12-08",
  };
  const sudamericano = { ...defaultSudamericano, ...(data.sudamericano || {}) };
  const heroImage =
    sudamericano.heroImage ||
    data.hero?.images?.[0] ||
    data.gallery?.[0]?.image ||
    "/uploads/flo-7643-copia-1777585679723.jpg";
  const venueUrl = sudamericano.venueUrl || ycaLocationUrl;
  const eventCardTitle = sudamericano.eventCardTitle || event.title;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="StarClass Argentina">
          <span><img src="/stars-logo.svg" alt="" /></span>
          StarClass Argentina
        </a>
        <NavHeader items={pageNavItems} />
      </header>

      <section className="sudamericano-hero">
        <div className="sudamericano-hero-bg" aria-hidden="true">
          <img src={heroImage} alt="" />
        </div>
        <div className="sudamericano-hero-content">
          <p className="kicker">{sudamericano.heroKicker}</p>
          <h1>{sudamericano.heroTitle}</h1>
          <p>{sudamericano.heroText}</p>
          <div className="sudamericano-actions">
            <a className="button primary" href="/#calendario">
              <CalendarDays size={18} />
              Ver calendario
            </a>
            <a className="button ghost" href="#expectativa">
              <ChevronRight size={18} />
              Conocer mas
            </a>
          </div>
        </div>
        <aside className="sudamericano-event-card">
          <Trophy size={28} />
          <span>{eventCardTitle}</span>
          <strong>{formatDateRange(event.start, event.end)}</strong>
          <p>
            <a href={venueUrl} target="_blank" rel="noopener noreferrer">
              <MapPin size={18} />
              {event.location || event.club}
            </a>
          </p>
        </aside>
      </section>

      <section className="section sudamericano-info" id="expectativa">
        <div className="section-header">
          <span>{sudamericano.infoEyebrow}</span>
          <h2>{sudamericano.infoTitle}</h2>
          <p>{sudamericano.infoText}</p>
        </div>
        <div className="sudamericano-feature-grid">
          <article>
            <CalendarDays size={24} />
            <strong>{formatDateRange(event.start, event.end)}</strong>
            <span>Programa de cuatro jornadas</span>
          </article>
          <article>
            <MapPin size={24} />
            <strong>{event.club || event.location}</strong>
            <span>Sede anfitriona</span>
          </article>
          <article>
            <Sailboat size={24} />
            <strong>Clase Star</strong>
            <span>Competencia tecnica y tactica</span>
          </article>
        </div>
      </section>

      <section className="section sudamericano-venue">
        <figure className="sudamericano-venue-media">
          <img src={sudamericano.venueImage} alt="Edificio del Yacht Club Argentino en Darsena Norte" />
          <figcaption>
            Foto: {sudamericano.venueImageCredit},{" "}
            <a href={sudamericano.venueImageSource} target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>{" "}
            <a href={sudamericano.venueImageLicense} target="_blank" rel="noopener noreferrer">
              CC BY-SA 3.0
            </a>
          </figcaption>
        </figure>
        <div className="sudamericano-venue-copy">
          <p className="kicker">{sudamericano.venueKicker}</p>
          <h2>{sudamericano.venueTitle}</h2>
          <p>{sudamericano.venueText}</p>
          <a className="button ghost" href={venueUrl} target="_blank" rel="noopener noreferrer">
            <Anchor size={18} />
            {sudamericano.venueButtonLabel}
          </a>
        </div>
      </section>

      <section className="section sudamericano-split">
        <div className="sudamericano-copy">
          <p className="kicker">{sudamericano.splitKicker}</p>
          <h2>{sudamericano.splitTitle}</h2>
          <p>{sudamericano.splitText}</p>
          <div className="sudamericano-badges">
            <span><Waves size={16} /> {sudamericano.badgeWater}</span>
            <span><Clock size={16} /> {sudamericano.badgeDate}</span>
            <a href={venueUrl} target="_blank" rel="noopener noreferrer">
              <Anchor size={16} />
              {sudamericano.badgeVenue}
            </a>
          </div>
        </div>
        <figure className="sudamericano-image">
          <img src={sudamericano.splitImage} alt="Barco Star navegando en el agua" />
        </figure>
      </section>
    </main>
  );
}
