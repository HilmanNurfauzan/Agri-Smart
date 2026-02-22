const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Tambahkan .wasm ke asset extensions agar expo-sqlite web bisa resolve wa-sqlite.wasm
config.resolver.assetExts.push("wasm");

// Pastikan .wasm tidak ada di sourceExts (harus diperlakukan sebagai asset, bukan source code)
config.resolver.sourceExts = config.resolver.sourceExts.filter(
  (ext) => ext !== "wasm",
);

module.exports = config;
