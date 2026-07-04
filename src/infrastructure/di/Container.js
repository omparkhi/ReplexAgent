export class Container {
  constructor() {
    /** @type {Map<string, () => unknown>} */
    this.factories = new Map();
    /** @type {Map<string, unknown>} */
    this.instances = new Map();
  }

  /**
   * @param {string} token
   * @param {() => unknown} factory
   * @returns {void}
   */
  registerSingleton(token, factory) {
    this.factories.set(token, factory);
  }

  /**
   * @template T
   * @param {string} token
   * @returns {T}
   */
  resolve(token) {
    if (this.instances.has(token)) {
      return /** @type {T} */ (this.instances.get(token));
    }

    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Dependency not registered: ${token}`);
    }

    const instance = factory();
    this.instances.set(token, instance);
    return /** @type {T} */ (instance);
  }
}
