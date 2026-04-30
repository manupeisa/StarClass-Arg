import { ArrowLeft, Trophy } from "lucide-react";
import { readStarclassData } from "../../lib/starclass-data";
import { buildGeneralRankingData } from "../../lib/general-ranking";
import { GeneralRankingTable } from "../../components/ui/general-ranking";

export const dynamic = "force-dynamic";

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export default async function PosicionamientoPage() {
  const data = await readStarclassData();
  const { championshipColumns, rows } = buildGeneralRankingData(data.championships);

  return (
    <main>
      <header className="ranking-page-hero">
        <a className="back-link ranking-back-link" href="/">
          <ArrowLeft size={18} />
          Volver al inicio
        </a>
        <p className="kicker">Tabla completa</p>
        <h1>Major</h1>
        <p>
          Se incluyen únicamente los timoneles que corrieron todos los campeonatos puntuables o que faltaron como máximo a uno. Si faltan a dos o más campeonatos incluidos, dejan de participar en el Major.
        </p>
        <div className="ranking-stats">
          <article>
            <Trophy size={20} />
            <strong>{rows.length}</strong>
            <span>Timoneles clasificados</span>
          </article>
          <article>
            <Trophy size={20} />
            <strong>{championshipColumns.length}</strong>
            <span>Campeonatos corridos</span>
          </article>
        </div>
      </header>

      <section className="section ranking-table-section">
        <SectionHeader eyebrow="General" title="Tabla de posición completa">
          Ordenada por puntos acumulados de los campeonatos incluidos. N/A marca el único campeonato permitido sin asistencia.
        </SectionHeader>
        <GeneralRankingTable rows={rows} championshipColumns={championshipColumns} />
      </section>
    </main>
  );
}

