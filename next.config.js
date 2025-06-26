/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // API 路由配置
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // 静态文件优化
  images: {
    domains: [],
    unoptimized: true, // 对于静态导出
  },
  
  // 输出配置 - 支持 Vercel 和 Netlify
  output: 'standalone',
  
  // 实验性功能
  experimental: {
    // 启用 App Router (如果需要)
    // appDir: true,
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 自定义 webpack 配置
    return config;
  },
};

module.exports = nextConfig;
