/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: "standalone", // disabled: NTFS symlink EPERM restriction on Public Documents build host
  transpilePackages: ["@medipaedia/ui", "@medipaedia/api-client", "@medipaedia/config"],
};

export default nextConfig;