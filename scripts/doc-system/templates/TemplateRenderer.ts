/**
 * Template rendering utility using Handlebars
 */

import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Register custom Handlebars helpers
 */
function registerHelpers() {
  // Greater than helper
  Handlebars.registerHelper('gt', function (a: number, b: number) {
    return a > b;
  });

  // Less than helper
  Handlebars.registerHelper('lt', function (a: number, b: number) {
    return a < b;
  });

  // Equality helper
  Handlebars.registerHelper('eq', function (a: any, b: any) {
    return a === b;
  });

  // Format date helper
  Handlebars.registerHelper('formatDate', function (date: Date) {
    return date.toISOString().split('T')[0];
  });
}

// Register helpers on module load
registerHelpers();

export class TemplateRenderer {
  private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
  private templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
  }

  /**
   * Load and compile a template
   */
  private async loadTemplate(
    templateName: string
  ): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load template file
    const templatePath = join(this.templatesDir, `${templateName}.hbs`);
    const templateContent = await readFile(templatePath, 'utf-8');

    // Compile template
    const compiled = Handlebars.compile(templateContent);

    // Cache compiled template
    this.templateCache.set(templateName, compiled);

    return compiled;
  }

  /**
   * Render a template with data
   */
  async render(templateName: string, data: any): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return template(data);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}
