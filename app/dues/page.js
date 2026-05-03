import { Anchor, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
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
  { label: "Dues", href: "/dues" },
];

function normalizeDues(row) {
  return {
    boat: row.boat || "",
    owner: row.owner || "",
    fleet: row.fleet || "",
    crew: row.crew || "",
    helmDues: row.helmDues || row.status || "Pendiente",
    crewDues: row.crewDues || "Pendiente",
    fay: row.fay || "No",
  };
}

function normalizeCrewDues(row) {
  return {
    crew: row.crew || "",
    crewDues: row.crewDues || "Pendiente",
  };
}

function StatusBadge({ value }) {
  const isPending = value === "Pendiente" || value === "No";
  const statusClass = value === "Life" ? "is-life" : isPending ? "is-pending" : "is-ok";
  const Icon = isPending ? ShieldCheck : CheckCircle2;

  return (
    <span className={`dues-status ${statusClass}`}>
      <Icon size={16} />
      {value}
    </span>
  );
}

export default async function DuesPage() {
  const data = await readStarclassData();
  const duesRows = (data.dues || []).map(normalizeDues);
  const crewRows = (Array.isArray(data.duesCrew) && data.duesCrew.length
    ? data.duesCrew
    : duesRows.map((row) => ({ crew: row.crew, crewDues: row.crewDues }))
  )
    .map(normalizeCrewDues)
    .filter((row) => row.crew);
  const activeHelms = duesRows.filter((row) => row.helmDues !== "Pendiente").length;
  const activeCrews = crewRows.filter((row) => row.crewDues !== "Pendiente").length;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="StarClass Argentina">
          <span><img src="/stars-logo.svg" alt="" /></span>
          StarClass Argentina
        </a>
        <NavHeader items={pageNavItems} />
      </header>

      <section className="dues-page-hero">
        <a className="back-link" href="/">
          <ArrowLeft size={18} />
          Volver al inicio
        </a>
        <p className="kicker">Administración de flota</p>
        <h1>Pago de Dues</h1>
        <p>
          Estado actualizado de barcos, propietarios, tripulantes, dues de timonel,
          dues de tripulantes y FAY.
        </p>
        <div className="dues-page-stats">
          <article>
            <Anchor size={20} />
            <strong>{duesRows.length}</strong>
            <span>barcos cargados</span>
          </article>
          <article>
            <CheckCircle2 size={20} />
            <strong>{activeHelms}</strong>
            <span>timoneles activos</span>
          </article>
          <article>
            <CheckCircle2 size={20} />
            <strong>{activeCrews}</strong>
            <span>tripulantes activos</span>
          </article>
        </div>
      </section>

      <section className="section dues-table-section">
        <div className="dues-table-heading">
          <p className="kicker">Dues timoneles</p>
          <h2>Estado por barco</h2>
        </div>
        <div className="dues-table-card">
          <table className="dues-table">
            <thead>
              <tr>
                <th>Barco</th>
                <th>Timonel</th>
                <th>Flota</th>
                <th>Dues Timonel</th>
                <th>FAY</th>
              </tr>
            </thead>
            <tbody>
              {duesRows.map((row, index) => (
                <tr key={`${row.boat}-${index}`}>
                  <td>{row.boat || "-"}</td>
                  <td>{row.owner || "-"}</td>
                  <td>{row.fleet || "-"}</td>
                  <td><StatusBadge value={row.helmDues} /></td>
                  <td><StatusBadge value={row.fay} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dues-table-heading">
          <p className="kicker">Dues tripulantes</p>
          <h2>Estado por tripulante</h2>
        </div>
        <div className="dues-table-card dues-crew-table-card">
          <table className="dues-table dues-crew-table">
            <thead>
              <tr>
                <th>Tripulante</th>
                <th>Dues Tripulante</th>
              </tr>
            </thead>
            <tbody>
              {crewRows.map((row, index) => (
                <tr key={`${row.crew || "tripulante"}-${index}`}>
                  <td>{row.crew}</td>
                  <td><StatusBadge value={row.crewDues} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
