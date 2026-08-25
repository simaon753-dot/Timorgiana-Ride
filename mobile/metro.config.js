// Configuração do empacotador.
//
// Existe por uma razão só: o Metro não conhece a extensão .pmtiles e, sem
// isto, `require('../assets/mapa/dili.pmtiles')` seria tratado como
// código-fonte e rebentava o empacotamento.
//
// Declarado como RECURSO, o ficheiro viaja ao lado do pacote em vez de
// dentro dele — e as actualizações pelo ar reaproveitam-no pelo seu
// resumo: descarrega-se uma vez e nunca mais, mesmo com dezenas de
// actualizações a seguir.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...config.resolver.assetExts, 'pmtiles'];

module.exports = config;
