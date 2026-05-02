import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../components/ui/footer";

export const metadata = {
  title: "StarClass Argentina",
  description: "Calendario, resultados, rankings y comunidad argentina de la Clase Star.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
