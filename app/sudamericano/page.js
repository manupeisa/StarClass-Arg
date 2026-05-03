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
const ycaBuildingImage = "/yca-darsena-norte.jpg";
const boatsImage = "/uploads/flo-8042-copia-1777585686571.jpg";

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
  const heroImage = data.hero?.images?.[0] || data.gallery?.[0]?.image || "/uploads/flo-7643-copia-1777585679723.jpg";

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
          <p className="kicker">Campeonato Sudamericano de StarClass</p>
          <h1>Un nuevo evento de la clase con todos los condimentos que ofrece Buenos Aires.</h1>
          <p>
            Cuatro dias para reunir talento, tradicion y competencia de alto nivel en la clase Star.
            La cuenta regresiva ya empezo.
          </p>
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
          <span>{event.title}</span>
          <strong>{formatDateRange(event.start, event.end)}</strong>
          <p>
            <a href={ycaLocationUrl} target="_blank" rel="noopener noreferrer">
              <MapPin size={18} />
              {event.location || event.club}
            </a>
          </p>
        </aside>
      </section>

      <section className="section sudamericano-info" id="expectativa">
        <div className="section-header">
          <span>Buenos Aires 2026</span>
          <h2>Un campeonato para mirar de cerca</h2>
          <p>
            El Sudamericano es una oportunidad para ver a la clase Star en su mejor formato:
            tripulaciones finas, decisiones tacticas exigentes y una cancha que premia experiencia.
          </p>
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
          <img src={ycaBuildingImage} alt="Edificio del Yacht Club Argentino en Darsena Norte" />
          <figcaption>
            Foto: Jrivell,{" "}
            <a href={ycaBuildingSource} target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>{" "}
            <a href={ycaBuildingLicense} target="_blank" rel="noopener noreferrer">
              CC BY-SA 3.0
            </a>
          </figcaption>
        </figure>
        <div className="sudamericano-venue-copy">
          <p className="kicker">Sede</p>
          <h2>YCA Darsena Norte como punto de encuentro.</h2>
          <p>
            La sede historica del Yacht Club Argentino suma identidad portuaria, cercania con la
            ciudad y una base ideal para recibir a las tripulaciones del Sudamericano.
          </p>
          <a className="button ghost" href={ycaLocationUrl} target="_blank" rel="noopener noreferrer">
            <Anchor size={18} />
            Ver sede del club
          </a>
        </div>
      </section>

      <section className="section sudamericano-split">
        <div className="sudamericano-copy">
          <p className="kicker">Expectativa</p>
          <h2>Una cita regional con identidad de flota.</h2>
          <p>
            La Darsena prepara un escenario ideal para recibir a timoneles y tripulantes de la region.
            El campeonato combina intensidad deportiva, comunidad y el valor historico de una clase
            que sigue convocando a los mejores navegantes.
          </p>
          <div className="sudamericano-badges">
            <span><Waves size={16} /> Rio de la Plata</span>
            <span><Clock size={16} /> Diciembre 2026</span>
            <a href={ycaLocationUrl} target="_blank" rel="noopener noreferrer">
              <Anchor size={16} />
              YCA Darsena
            </a>
          </div>
        </div>
        <figure className="sudamericano-image">
          <img src={boatsImage} alt="Barco Star navegando en el agua" />
        </figure>
      </section>
    </main>
  );
}
