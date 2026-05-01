/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "Imagenes/**/*",
        "San isidro labrador/**/*",
        "public/uploads/**/*",
      ],
    },
  },
};

export default nextConfig;
