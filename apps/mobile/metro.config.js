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

const authPackageRoot = path.join(workspaceRoot, "packages/auth");
const authEntry = path.join(authPackageRoot, "src/index.ts");

const uiPackageRoot = path.join(workspaceRoot, "packages/ui");
const uiEntry = path.join(uiPackageRoot, "src/index.ts");

const updatePackageRoot = path.join(workspaceRoot, "packages/update");
const updateEntry = path.join(updatePackageRoot, "src/index.ts");

const walletPackageRoot = path.join(workspaceRoot, "packages/wallet");
const walletEntry = path.join(walletPackageRoot, "src/index.ts");

// On web, react-native-quick-crypto has no web implementation (Nitro/TurboModule only).
// Redirect it to a no-op shim so install() is safe to call on all platforms — web already
// has native crypto.subtle. shims/react-native-quick-crypto.web.js just exports { install: () => {} }.
const reactNativeQuickCryptoShim = path.join(
  __dirname,
  "shims/react-native-quick-crypto.web.js",
);

config.watchFolders = Array.from(
  new Set([...(config.watchFolders || []), workspaceRoot]),
);

// Keep a single React runtime on web by pinning resolver targets to app versions.
const reactPath = path.dirname(appRequire.resolve("react/package.json"));
const reactDomPath = path.dirname(appRequire.resolve("react-dom/package.json"));
const reactNativePath = path.dirname(appRequire.resolve("react-native/package.json"));
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
  "@alternun/auth": authPackageRoot,
  "@alternun/ui": uiPackageRoot,
  "@alternun/update": updatePackageRoot,
  "@alternun/wallet": walletPackageRoot,
  react: reactPath,
  "react-dom": reactDomPath,
  "react-native": reactNativePath,
  "expo-asset": expoAssetPath,
};

// valtio (pulled in via @walletconnect → @reown/appkit) ships pre-compiled code
// that contains `import.meta.env` checks.  Metro bundles scripts as non-module
// <script> tags, so the browser throws SES_UNCAUGHT_EXCEPTION for `import.meta`.
// Explicitly including valtio in the transform pass lets babel-preset-expo
// replace `import.meta.env` with `process.env` equivalents at build time.
const defaultIgnorePattern =
  config.transformer?.transformIgnorePatterns?.[0] ??
  /node_modules\/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?\/.*|@expo-google-fonts\/.*|react-navigation|@react-navigation\/.*|@unimodules\/.*|unimodules|sentry-expo|native-base|react-native-svg)/;

const additionalTransformPackages = ["valtio", "@reown", "@alternun"];
const basePattern = defaultIgnorePattern.toString().slice(1, -1); // strip leading/trailing /
config.transformer = config.transformer || {};
config.transformer.transformIgnorePatterns = [
  new RegExp(
    basePattern.replace(
      "(?!(",
      `(?!(${additionalTransformPackages.join("|")}|`,
    ),
  ),
];

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
  // Pin react-native to the app version so workspace packages (e.g. @alternun/ui)
  // that bundle their own copy of react-native don't create a duplicate runtime.
  // Re-root resolution to the app directory so pnpm's local symlink in
  // packages/ui/node_modules is never reached.
  if (moduleName === "react-native") {
    return resolve(
      { ...context, originModulePath: path.join(__dirname, "package.json") },
      "react-native",
      platform,
    );
  }
  // Redirect react-native-quick-crypto to a no-op shim on web (no Nitro/TurboModules there).
  if (moduleName === "react-native-quick-crypto" && platform === "web") {
    return { type: "sourceFile", filePath: reactNativeQuickCryptoShim };
  }
  if (moduleName === "@alternun/ui") {
    return { type: "sourceFile", filePath: uiEntry };
  }
  if (moduleName === "@alternun/update") {
    return { type: "sourceFile", filePath: updateEntry };
  }
  if (moduleName === "@alternun/wallet") {
    return { type: "sourceFile", filePath: walletEntry };
  }
  if (moduleName === "expo-asset") {
    return { type: "sourceFile", filePath: expoAssetEntry };
  }
  if (moduleName === "@alternun/i18n") {
    return { type: "sourceFile", filePath: i18nEntry };
  }
  if (moduleName === "@alternun/auth") {
    return { type: "sourceFile", filePath: authEntry };
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
