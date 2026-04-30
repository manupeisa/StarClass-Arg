import { calculateGeneralRankingTotal, getGeneralRankingDisplayScore } from "../../lib/general-ranking";

export function GeneralRankingPreview({ rows = [], href = "/posicionamiento" }) {
  const topRows = rows.slice(0, 3);

  if (!topRows.length) {
    return (
      <div className="ranking-preview empty">
        <p>Aún no hay campeonatos corridos para construir la general.</p>
        <a className="button ghost ranking-preview-link" href={href}>
          Ver tabla completa
        </a>
      </div>
    );
  }

  return (
    <div className="ranking-preview">
      <div className="ranking-preview-list">
        {topRows.map((row, i) => {
          const rank = row.position || i + 1;
          const rankClass = `rank-${rank}`;
          return (
            <article className={`ranking-preview-card ${rankClass}`} key={`${row.position}-${row.helm}`}>
              <div className="ranking-preview-rank">{rank}</div>
              <div className="ranking-preview-body">
                <strong>{row.helm}</strong>
                <span>{row.boat || "Barco sin definir"}</span>
                <small>{row.appearances} campeonato{row.appearances === 1 ? "" : "s"}</small>
              </div>
              <div className="ranking-preview-total">
                <span>Puntos</span>
                <strong>{row.total}</strong>
              </div>
            </article>
          );
        })}
      </div>
      <a className="button ghost ranking-preview-link" href={href}>
        Ver tabla completa
      </a>
    </div>
  );
}

export function GeneralRankingTable({ rows = [], championshipColumns = [] }) {
  if (!rows.length) {
    return (
      <div className="table-wrap">
        <div className="ranking-empty-state">Aún no hay resultados cargados para mostrar la tabla completa.</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table style={{ minWidth: `${640 + championshipColumns.length * 140}px` }}>
        <thead>
          <tr>
            <th>Pos.</th>
            <th>Barco</th>
            <th>Timón</th>
            <th>Tripulante</th>
            {championshipColumns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.position}-${row.boat}-${row.helm}`}>
              <td>{row.position}</td>
              <td>{row.boat}</td>
              <td>{row.helm}</td>
              <td>{row.crew}</td>
              {championshipColumns.map((column) => (
                <td key={`${row.boat}-${column.key}`}>{getGeneralRankingDisplayScore(row, column.key)}</td>
              ))}
              <td>{calculateGeneralRankingTotal(row, championshipColumns)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
