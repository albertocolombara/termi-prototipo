const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Pacotes de blocos Landsat (vários WebP concatenados) vão como arquivos brutos.
config.resolver.assetExts.push('bin');

module.exports = config;
