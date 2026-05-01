/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        ".git/**/*",
        "Imagenes/**/*",
        "San isidro labrador/**/*",
        "public/uploads/**/*",
      ],
    },
  },
};

export default nextConfig;
