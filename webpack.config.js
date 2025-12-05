const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@react-navigation']
    }
  }, argv);
  
  if (config.devServer) {
    config.devServer = {
      ...config.devServer,
      host: '0.0.0.0',
      allowedHosts: 'all',
      client: {
        webSocketURL: 'auto://0.0.0.0:0/ws'
      }
    };
  }
  
  return config;
};
