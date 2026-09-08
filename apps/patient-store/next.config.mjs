/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@medipaedia/ui", "@medipaedia/api-client", "@medipaedia/config"],
};

export default nextConfig;
