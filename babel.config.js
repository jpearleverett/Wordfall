module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // React Compiler v1.0 — auto-memoizes every component and hook.
          // Replaces manual useMemo/useCallback/React.memo for most cases.
          // Scoped to src/ so third-party code and config files are untouched.
          'react-compiler': {
            sources: (filename) => filename.includes('src/'),
          },
        },
      ],
    ],
    // MUST be last — see CLAUDE.md "Babel plugin" gotcha.
    plugins: ['react-native-worklets/plugin'],
  };
};
