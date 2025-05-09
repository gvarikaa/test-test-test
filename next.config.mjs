/** @type {import('next').NextConfig} */
const nextConfig = {
  // გარე გამოსახულებების მოძიებისთვის დაშვებული დომენები
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.bunnycdn.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  // ესპერიმენტული მოდულების ჩართვა
  experimental: {
    // ოპტიმიზაციები
    optimizePackageImports: [
      'lucide-react',
    ],
  },
  // დამატებითი პარამეტრები
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;