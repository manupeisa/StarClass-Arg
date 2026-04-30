import { readStarclassData } from "../../lib/starclass-data";

export default async function Footer() {
  let copyrightText = "2026 StarClass todos los derechos reservados";
  try {
    const data = await readStarclassData();
    if (data && typeof data.copyright === "string" && data.copyright.trim()) {
      copyrightText = data.copyright;
    }
  } catch (err) {
    // keep default if reading fails
    // console.warn('Footer: could not read starclass data', err);
  }

  return (
    <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '18px 24px', background: 'transparent', textAlign: 'center' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', color: 'rgba(16,32,37,0.6)', fontSize: 14 }}>
        <div>{copyrightText}</div>
      </div>
    </footer>
  );
}
