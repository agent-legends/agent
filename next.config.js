const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: {
    domains: ["ipfs.io", "gateway.pinata.cloud", "cloudflare-ipfs.com"],
  },
  webpack: (config) => {
    config.externals.push("lokijs", "encoding");
    config.plugins.push(
      // Pino's optional pretty transport is development-only; Workers use JSON logs.
      new webpack.IgnorePlugin({ resourceRegExp: /^pino-pretty$/ }),
      // MetaMask only uses this optional peer in React Native, not in the browser.
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /@x402/,
      })
    );
    return config;
  },
};

module.exports = nextConfig;
