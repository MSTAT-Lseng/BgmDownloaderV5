const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer"),
  };

  config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...config.resolver.sourceExts, "svg"],
  };

  config.resolver.assetExts.push('txt');
  // expo-sqlite 的 Web 实现依赖 wa-sqlite 的 .wasm 资源（SDK 55+ 起需要）
  config.resolver.assetExts.push('wasm');

  return config;
})();
