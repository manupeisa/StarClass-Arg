import { readStarclassData } from "../lib/starclass-data";
import { championshipSlug } from "../lib/slug";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.starclass.ar";

function toAbsoluteUrl(pathname) {
  return new URL(pathname, siteUrl).toString();
}

export default async function sitemap() {
  const data = await readStarclassData();
  const championships = Array.isArray(data?.championships) ? data.championships : [];

  const championshipUrls = championships.map((championship, index) => ({
    url: toAbsoluteUrl(`/campeonatos/${championshipSlug(championship, index)}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: toAbsoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/posicionamiento"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...championshipUrls,
  ];
}