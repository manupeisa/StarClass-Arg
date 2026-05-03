import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Footer from "../components/ui/footer";

export const metadata = {
  title: "StarClass Argentina",
  description: "Calendario, resultados, rankings y comunidad argentina de la Clase Star.",
  icons: {
    icon: "/district-18-logo-final.png",
    shortcut: "/district-18-logo-final.png",
    apple: "/district-18-logo-final.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/district-18-logo-final.png" />
      </head>
      <body>
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
