const { describe, expect, it } = require('@jest/globals');
const fs = require('fs');
const { createRequire } = require('module');
const path = require('path');
const packageJson = require('../package.json');

const {
  getMetroWatchFolders,
  getPackageDependencyPackageRoots,
  resolvePackageRoot,
} = require('../metro-watch-folders');

describe('mobile metro config', () => {
  it('limits workspace watching to the shared package source folders', () => {
    const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
    const appRequire = createRequire(path.join(workspaceRoot, 'apps/mobile/package.json'));
    const expoRequire = createRequire(appRequire.resolve('expo/package.json'));
    const expoPackageRoot = path.dirname(appRequire.resolve('expo/package.json'));
    const expoPackageJson = require(appRequire.resolve('expo/package.json'));
    const expoDependencyPackageRoots = getPackageDependencyPackageRoots(
      expoRequire,
      expoPackageJson.dependencies,
    );
    const expoRouterPackageRoot = fs.realpathSync(
      path.join(workspaceRoot, 'apps/mobile/node_modules/expo-router'),
    );
    const expoRouterRequire = createRequire(
      path.join(expoRouterPackageRoot, 'package.json'),
    );
    const expoRouterPackageJson = require(
      appRequire.resolve('expo-router/package.json'),
    );
    const expoRouterDependencyPackageRoots = getPackageDependencyPackageRoots(
      expoRouterRequire,
      expoRouterPackageJson.dependencies,
    );
    const expoMetroRuntimePackageRoot = path.dirname(
      expoRequire.resolve('@expo/metro-runtime/package.json'),
    );
    const expoMetroRuntimeRequire = createRequire(
      path.join(expoMetroRuntimePackageRoot, 'package.json'),
    );
    const expoMetroRuntimePackageJson = require(
      expoRequire.resolve('@expo/metro-runtime/package.json'),
    );
    const expoMetroRuntimeDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        expoMetroRuntimeRequire,
        expoMetroRuntimePackageJson.dependencies,
      );
    const expoModulesCorePackageRoot = path.dirname(
      expoRequire.resolve('expo-modules-core/package.json'),
    );
    const babelRuntimePackageRoot = path.dirname(
      expoRequire.resolve('@babel/runtime/package.json'),
    );
    const reactNativeCssInteropPackageRoot = path.dirname(
      expoRequire.resolve('react-native-css-interop/package.json'),
    );
    const reactNativeWebPackageRoot = path.dirname(
      appRequire.resolve('react-native-web/package.json'),
    );
    const reactNativeWebRequire = createRequire(
      path.join(reactNativeWebPackageRoot, 'package.json'),
    );
    const reactNativeWebPackageJson = require(
      appRequire.resolve('react-native-web/package.json'),
    );
    const reactNativeWebDependencyPackageRoots = getPackageDependencyPackageRoots(
      reactNativeWebRequire,
      reactNativeWebPackageJson.dependencies,
    );
    const metroPackageRoot = path.dirname(expoRequire.resolve('metro/package.json'));
    const metroRequire = createRequire(path.join(metroPackageRoot, 'package.json'));
    const metroRuntimePackageRoot = path.dirname(
      metroRequire.resolve('metro-runtime/package.json'),
    );
    const reactNavigationNativePackageRoot = path.dirname(
      appRequire.resolve('@react-navigation/native/package.json'),
    );
    const reactNavigationNativeRequire = createRequire(
      path.join(reactNavigationNativePackageRoot, 'package.json'),
    );
    const reactNavigationNativePackageJson = require(
      appRequire.resolve('@react-navigation/native/package.json'),
    );
    const reactNavigationCorePackageRoot = path.dirname(
      reactNavigationNativeRequire.resolve('@react-navigation/core/package.json'),
    );
    const reactNavigationCoreRequire = createRequire(
      path.join(reactNavigationCorePackageRoot, 'package.json'),
    );
    const reactNavigationCorePackageJson = require(
      reactNavigationNativeRequire.resolve('@react-navigation/core/package.json'),
    );
    const reactNavigationElementsPackageRoot = path.dirname(
      reactNavigationNativeRequire.resolve('@react-navigation/elements/package.json'),
    );
    const reactNavigationElementsPackageJson = require(
      reactNavigationNativeRequire.resolve('@react-navigation/elements/package.json'),
    );
    const reactNavigationRoutersPackageRoot = path.dirname(
      reactNavigationCoreRequire.resolve('@react-navigation/routers/package.json'),
    );
    const reactNavigationRoutersPackageJson = require(
      reactNavigationCoreRequire.resolve('@react-navigation/routers/package.json'),
    );
    const reactNavigationBottomTabsPackageRoot = path.dirname(
      appRequire.resolve('@react-navigation/bottom-tabs/package.json'),
    );
    const reactNavigationBottomTabsPackageJson = require(
      appRequire.resolve('@react-navigation/bottom-tabs/package.json'),
    );
    const reactNavigationNativeStackPackageRoot = path.dirname(
      reactNavigationNativeRequire.resolve('@react-navigation/native-stack/package.json'),
    );
    const reactNavigationNativeStackRequire = createRequire(
      path.join(reactNavigationNativeStackPackageRoot, 'package.json'),
    );
    const reactNavigationNativeStackPackageJson = require(
      reactNavigationNativeRequire.resolve('@react-navigation/native-stack/package.json'),
    );
    const reactNavigationCoreDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        reactNavigationCoreRequire,
        reactNavigationCorePackageJson.dependencies,
      );
    const reactNavigationNativeDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        reactNavigationNativeRequire,
        reactNavigationNativePackageJson.dependencies,
      );
    const reactNavigationElementsDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        reactNavigationNativeRequire,
        reactNavigationElementsPackageJson.dependencies,
      );
    const reactNavigationRoutersDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        reactNavigationCoreRequire,
        reactNavigationRoutersPackageJson.dependencies,
      );
    const reactNavigationBottomTabsDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        appRequire,
        reactNavigationBottomTabsPackageJson.dependencies,
      );
    const reactNavigationNativeStackDependencyPackageRoots =
      getPackageDependencyPackageRoots(
        reactNavigationNativeStackRequire,
        reactNavigationNativeStackPackageJson.dependencies,
      );
    const reactNativeGestureHandlerPackageRoot = path.dirname(
      appRequire.resolve('react-native-gesture-handler/package.json'),
    );
    const reactNativeReanimatedPackageRoot = path.dirname(
      appRequire.resolve('react-native-reanimated/package.json'),
    );
    const reactNativeSafeAreaContextPackageRoot = path.dirname(
      appRequire.resolve('react-native-safe-area-context/package.json'),
    );
    const reactNativeScreensPackageRoot = path.dirname(
      appRequire.resolve('react-native-screens/package.json'),
    );
    const reactNativeWorkletsPackageRoot = path.dirname(
      appRequire.resolve('react-native-worklets/package.json'),
    );
    const reactPackageRoot = path.dirname(appRequire.resolve('react/package.json'));
    const reactDomPackageRoot = path.dirname(appRequire.resolve('react-dom/package.json'));
    const reactNativePackageRoot = path.dirname(
      appRequire.resolve('react-native/package.json'),
    );
    const expoAssetPackageRoot = path.dirname(
      expoRequire.resolve('expo-asset/package.json'),
    );
    const authPackageRoot = path.join(workspaceRoot, 'packages/auth');
    const authPackageJson = require(path.join(authPackageRoot, 'package.json'));
    const authPackageRequire = createRequire(path.join(authPackageRoot, 'package.json'));
    const edcalderonAuthPackageRoot = path.dirname(
      authPackageRequire.resolve('@edcalderon/auth'),
    );
    const authDependencyPackageRoots = getPackageDependencyPackageRoots(
      authPackageRequire,
      authPackageJson.dependencies,
    );
    const walletPackageRoot = path.join(workspaceRoot, 'packages/wallet');
    const walletPackageJson = require(path.join(walletPackageRoot, 'package.json'));
    const walletPackageRequire = createRequire(
      path.join(walletPackageRoot, 'package.json'),
    );
    const walletDependencyPackageRoots = getPackageDependencyPackageRoots(
      walletPackageRequire,
      walletPackageJson.dependencies,
    );

    const expoDirectPackageRoots = [
      'expo-atlas',
      'expo-blur',
      'expo-clipboard',
      'expo-constants',
      'expo-file-system',
      'expo-font',
      'expo-haptics',
      'expo-image',
      'expo-linking',
      'expo-router',
      'expo-secure-store',
      'expo-sharing',
      'expo-splash-screen',
      'expo-status-bar',
      'expo-symbols',
      'expo-system-ui',
      'expo-video',
      'expo-web-browser',
      '@expo/vector-icons',
    ].map((packageName) => resolvePackageRoot(appRequire, packageName));
    const collectDependencyMapsForPackageRoots = (packageRoots) => {
      const packageDependencyPackageRoots = [];
      const seenPackageRoots = new Set();
      const queue = [...packageRoots];

      while (queue.length > 0) {
        const packageRoot = queue.shift();

        if (typeof packageRoot !== 'string' || packageRoot.length === 0) {
          continue;
        }

        if (seenPackageRoots.has(packageRoot)) {
          continue;
        }
        seenPackageRoots.add(packageRoot);

        try {
          const packageRequire = createRequire(path.join(packageRoot, 'package.json'));
          const packageJson = require(path.join(packageRoot, 'package.json'));
          const dependencyPackageRoots = getPackageDependencyPackageRoots(
            packageRequire,
            packageJson.dependencies,
          );
          packageDependencyPackageRoots.push(...dependencyPackageRoots);
          for (const dependencyPackageRoot of dependencyPackageRoots) {
            if (!seenPackageRoots.has(dependencyPackageRoot)) {
              queue.push(dependencyPackageRoot);
            }
          }
        } catch {
          // Ignore packages that are not available in the current install graph.
        }
      }

      return Array.from(new Set(packageDependencyPackageRoots));
    };
    const expoDirectDependencyPackageRoots = collectDependencyMapsForPackageRoots(
      expoDirectPackageRoots,
    );
    const transitiveDependencyPackageRoots = collectDependencyMapsForPackageRoots([
      expoPackageRoot,
      expoRouterPackageRoot,
      expoMetroRuntimePackageRoot,
      reactDomPackageRoot,
      reactNativeWebPackageRoot,
      reactNavigationNativePackageRoot,
      reactNavigationCorePackageRoot,
      reactNavigationElementsPackageRoot,
      reactNavigationRoutersPackageRoot,
      reactNavigationBottomTabsPackageRoot,
      reactNavigationNativeStackPackageRoot,
      reactNativeCssInteropPackageRoot,
      reactNativeGestureHandlerPackageRoot,
      reactNativeReanimatedPackageRoot,
      reactNativeSafeAreaContextPackageRoot,
      reactNativeScreensPackageRoot,
      reactNativeWorkletsPackageRoot,
      authPackageRoot,
      walletPackageRoot,
      ...expoDirectPackageRoots,
    ]);

    const mobileDependencyPackageRoots = getPackageDependencyPackageRoots(
      appRequire,
      packageJson.dependencies,
    );

    const watchedPackageRoots = Array.from(
      new Set([
        expoPackageRoot,
        ...expoDependencyPackageRoots,
        expoRouterPackageRoot,
        ...expoRouterDependencyPackageRoots,
        expoMetroRuntimePackageRoot,
        ...expoMetroRuntimeDependencyPackageRoots,
        expoModulesCorePackageRoot,
        babelRuntimePackageRoot,
        reactNativeCssInteropPackageRoot,
        reactNativeWebPackageRoot,
        ...reactNativeWebDependencyPackageRoots,
        metroRuntimePackageRoot,
        reactPackageRoot,
        reactDomPackageRoot,
        reactNativePackageRoot,
        expoAssetPackageRoot,
        reactNavigationNativePackageRoot,
        reactNavigationCorePackageRoot,
        reactNavigationElementsPackageRoot,
        reactNavigationRoutersPackageRoot,
        reactNavigationBottomTabsPackageRoot,
        reactNavigationNativeStackPackageRoot,
        reactNativeGestureHandlerPackageRoot,
        reactNativeReanimatedPackageRoot,
        reactNativeSafeAreaContextPackageRoot,
        reactNativeScreensPackageRoot,
        reactNativeWorkletsPackageRoot,
        ...reactNavigationCoreDependencyPackageRoots,
        ...reactNavigationNativeDependencyPackageRoots,
        ...reactNavigationElementsDependencyPackageRoots,
        ...reactNavigationRoutersDependencyPackageRoots,
        ...reactNavigationBottomTabsDependencyPackageRoots,
        ...reactNavigationNativeStackDependencyPackageRoots,
        ...authDependencyPackageRoots,
        ...walletDependencyPackageRoots,
        ...transitiveDependencyPackageRoots,
        edcalderonAuthPackageRoot,
        ...expoDirectPackageRoots,
        ...expoDirectDependencyPackageRoots,
        ...mobileDependencyPackageRoots,
      ]),
    );

    expect(getMetroWatchFolders(workspaceRoot, watchedPackageRoots)).toEqual([
      ...watchedPackageRoots,
      path.join(workspaceRoot, 'packages/auth/src'),
      path.join(workspaceRoot, 'packages/i18n/src'),
      path.join(workspaceRoot, 'packages/ui/src'),
      path.join(workspaceRoot, 'packages/update/src'),
      path.join(workspaceRoot, 'packages/wallet/src'),
    ]);
  });

  it('keeps the app entry on the standard expo-router entry', () => {
    expect(packageJson.main).toBe('expo-router/entry');
  });
});
