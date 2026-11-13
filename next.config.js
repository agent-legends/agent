const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud", "cloudflare-ipfs.com"],
  },
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@x402/,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
