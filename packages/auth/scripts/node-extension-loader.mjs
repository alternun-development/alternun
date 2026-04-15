export async function resolve(specifier, context, defaultResolve) {
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.(?:js|mjs|cjs|json)$/.test(specifier)) {
    try {
      return await defaultResolve(`${specifier}.js`, context, defaultResolve);
    } catch {
      try {
        return await defaultResolve(`${specifier}/index.js`, context, defaultResolve);
      } catch {
        // Fall through to the default resolver below.
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
