/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Permitir acceso desde la red local
  allowedDevOrigins: ['10.20.18.110', 'localhost'],
}

export default nextConfig
