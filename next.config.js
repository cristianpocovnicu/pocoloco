/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // pozele de profil venite prin Google OAuth
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
}

module.exports = nextConfig
