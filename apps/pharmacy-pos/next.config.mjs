/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@medipaedia/ui", "@medipaedia/api-client", "@medipaedia/config"],
};

export default nextConfig;
