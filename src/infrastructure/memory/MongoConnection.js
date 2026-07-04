import { MongoClient } from 'mongodb';

export class MongoConnection {
  /**
   * @param {object} options
   * @param {string} options.uri
   * @param {string} options.databaseName
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} options.logger
   */
  constructor(options) {
    this.uri = options.uri;
    this.databaseName = options.databaseName;
    this.logger = options.logger;
    this.client = new MongoClient(this.uri, {
      ignoreUndefined: true,
      maxPoolSize: 20,
      minPoolSize: 0
    });
    /** @type {Promise<MongoClient> | null} */
    this.connectionPromise = null;
  }

  /**
   * @returns {Promise<MongoClient>}
   */
  async connect() {
    if (!this.connectionPromise) {
      this.connectionPromise = this.client.connect();
      await this.connectionPromise;
      this.logger.info({ database: this.databaseName }, 'MongoDB connected');
    }

    return this.connectionPromise;
  }

  /**
   * @returns {Promise<import('mongodb').Db>}
   */
  async db() {
    const client = await this.connect();
    return client.db(this.databaseName);
  }

  async close() {
    await this.client.close();
    this.connectionPromise = null;
  }
}
