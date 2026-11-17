module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Some dependencies (valtio via @reown/appkit) ship `import.meta.env`; on web Metro
          // serves classic scripts, where `import.meta` is a SyntaxError that stops the whole
          // chunk. This rewrites it to Expo's import.meta registry.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};
