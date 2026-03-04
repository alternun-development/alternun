const path = require("path");
const { createRequire } = require("module");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const appRequire = createRequire(path.join(__dirname, "package.json"));
const expoRequire = createRequire(appRequire.resolve("expo/package.json"));

// Keep a single React runtime on web by pinning resolver targets to app versions.
const reactPath = path.dirname(appRequire.resolve("react/package.json"));
const reactDomPath = path.dirname(appRequire.resolve("react-dom/package.json"));
const expoAssetPath = path.dirname(expoRequire.resolve("expo-asset/package.json"));

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: reactPath,
  "react-dom": reactDomPath,
  "expo-asset": expoAssetPath,
};

module.exports = withNativeWind(config, { input: "./global.css" });
