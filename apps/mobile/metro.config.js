const path = require("path");
const { createRequire } = require("module");
const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");
const appRequire = createRequire(path.join(__dirname, "package.json"));
const expoRequire = createRequire(appRequire.resolve("expo/package.json"));
const i18nPackageRoot = path.join(workspaceRoot, "packages/i18n");
const i18nEntry = path.join(i18nPackageRoot, "src/index.ts");
const i18nCatalogsRoot = path.join(i18nPackageRoot, "src/catalogs");

config.watchFolders = Array.from(
  new Set([...(config.watchFolders || []), workspaceRoot]),
);

// Keep a single React runtime on web by pinning resolver targets to app versions.
const reactPath = path.dirname(appRequire.resolve("react/package.json"));
const reactDomPath = path.dirname(appRequire.resolve("react-dom/package.json"));
const expoAssetPath = path.dirname(expoRequire.resolve("expo-asset/package.json"));
const reactEntry = appRequire.resolve("react");
const reactJsxRuntimeEntry = appRequire.resolve("react/jsx-runtime");
const reactJsxDevRuntimeEntry = appRequire.resolve("react/jsx-dev-runtime");
const reactDomEntry = appRequire.resolve("react-dom");
const reactDomClientEntry = appRequire.resolve("react-dom/client");
const expoAssetEntry = expoRequire.resolve("expo-asset");

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@alternun/i18n": i18nPackageRoot,
  react: reactPath,
  "react-dom": reactDomPath,
  "expo-asset": expoAssetPath,
};

// Force a single React runtime for every workspace package (including symlinked deps).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react") {
    return { type: "sourceFile", filePath: reactEntry };
  }
  if (moduleName === "react/jsx-runtime") {
    return { type: "sourceFile", filePath: reactJsxRuntimeEntry };
  }
  if (moduleName === "react/jsx-dev-runtime") {
    return { type: "sourceFile", filePath: reactJsxDevRuntimeEntry };
  }
  if (moduleName === "react-dom") {
    return { type: "sourceFile", filePath: reactDomEntry };
  }
  if (moduleName === "react-dom/client") {
    return { type: "sourceFile", filePath: reactDomClientEntry };
  }
  if (moduleName === "expo-asset") {
    return { type: "sourceFile", filePath: expoAssetEntry };
  }
  if (moduleName === "@alternun/i18n") {
    return { type: "sourceFile", filePath: i18nEntry };
  }
  if (moduleName.startsWith("@alternun/i18n/catalogs/")) {
    return {
      type: "sourceFile",
      filePath: path.join(
        i18nCatalogsRoot,
        moduleName.slice("@alternun/i18n/catalogs/".length),
      ),
    };
  }
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
