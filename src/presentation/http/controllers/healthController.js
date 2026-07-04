/**
 * @param {import('../../../domain/interfaces/config.interface.js').ConfigManager} config
 */
export function createHealthController(config) {
  return {
    /**
     * @param {import('express').Request} _req
     * @param {import('express').Response} res
     */
    check(_req, res) {
      res.json({
        status: 'ok',
        environment: config.get('nodeEnv'),
        timestamp: new Date().toISOString()
      });
    }
  };
}
