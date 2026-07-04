import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates');

/**
 * Loads prompt templates from JSON files in the templates directory.
 */
export class TemplateLoader {
  /**
   * @param {object} [options]
   * @param {string} [options.templatesDir]
   * @param {import('../../domain/interfaces/logger.interface.js').Logger} [options.logger]
   */
  constructor(options = {}) {
    this.templatesDir = options.templatesDir ?? TEMPLATES_DIR;
    this.logger = options.logger;
  }

  /**
   * Load all templates from the templates directory.
   * @returns {Promise<import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate[]>}
   */
  async loadAll() {
    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.templatesDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const results = await Promise.all(
        jsonFiles.map((file) => this.loadFile(join(this.templatesDir, file)))
      );

      return /** @type {import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate[]} */ (
        results.filter((t) => t !== null)
      );
    } catch (error) {
      this.logger?.warn({ error, templatesDir: this.templatesDir }, 'Failed to load templates directory');
      return [];
    }
  }

  /**
   * Load a single template from a JSON file.
   * @param {string} filePath
   * @returns {Promise<import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate | null>}
   */
  async loadFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const template = /** @type {import('../../domain/interfaces/prompt-builder.interface.js').PromptTemplate} */ (JSON.parse(content));

      if (!template.agentId || !template.sections?.length) {
        this.logger?.warn({ filePath }, 'Invalid template file, skipping');
        return null;
      }

      return template;
    } catch (error) {
      this.logger?.warn({ error, filePath }, 'Failed to load template file');
      return null;
    }
  }
}
