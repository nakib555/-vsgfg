/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // swcMinify: true, // Removed: swcMinify is enabled by default in Next.js 15+
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // webpack: (config, { isServer }) => {
  //   // Monaco Editor uses CSS files which need to be handled.
  //   // This is often handled by @monaco-editor/react automatically with Next.js,
  //   // but if you encounter issues with CSS loading, you might need a custom webpack config.
  //   // For now, let's assume the default handling is sufficient.
  //   // If not, you might need something like:
  //   // if (!isServer) {
  //   //   config.module.rules.push({
  //   //     test: /\.css$/,
  //   //     use: ['style-loader', 'css-loader'],
  //   //   });
  //   // }
  //   return config;
  // },
}

export default nextConfig