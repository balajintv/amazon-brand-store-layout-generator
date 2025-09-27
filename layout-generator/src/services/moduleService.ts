import { ModuleCatalog, PatternAnalysis, LayoutTemplate } from '../types';

class ModuleService {
  private catalog: ModuleCatalog | null = null;
  private patterns: PatternAnalysis | null = null;
  private templates: LayoutTemplate[] | null = null;

  async loadCatalog(): Promise<ModuleCatalog> {
    if (this.catalog) return this.catalog;

    try {
      const response = await fetch('/processed_modules/data/modules_catalog.json');
      if (!response.ok) {
        throw new Error(`Failed to load catalog: ${response.statusText}`);
      }
      this.catalog = await response.json();
      return this.catalog!;
    } catch (error) {
      console.error('Error loading module catalog:', error);
      throw error;
    }
  }

  async loadPatterns(): Promise<PatternAnalysis> {
    if (this.patterns) return this.patterns;

    try {
      const response = await fetch('/processed_modules/data/patterns.json');
      if (!response.ok) {
        throw new Error(`Failed to load patterns: ${response.statusText}`);
      }
      this.patterns = await response.json();
      return this.patterns!;
    } catch (error) {
      console.error('Error loading patterns:', error);
      throw error;
    }
  }

  async loadTemplates(): Promise<LayoutTemplate[]> {
    if (this.templates) return this.templates;

    try {
      const response = await fetch('/processed_modules/data/templates.json');
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.statusText}`);
      }
      const data = await response.json();
      this.templates = data.basic_layouts || [];
      return this.templates!;
    } catch (error) {
      console.error('Error loading templates:', error);
      throw error;
    }
  }

  async getModulesByType(type: string): Promise<any[]> {
    const catalog = await this.loadCatalog();
    return catalog.modules.filter(module => module.type === type);
  }

  async searchModules(query: string): Promise<any[]> {
    const catalog = await this.loadCatalog();
    const lowerQuery = query.toLowerCase();

    return catalog.modules.filter(module =>
      module.type.toLowerCase().includes(lowerQuery) ||
      module.name.toLowerCase().includes(lowerQuery) ||
      module.source_file.toLowerCase().includes(lowerQuery)
    );
  }

  async getSectionTypes(): Promise<string[]> {
    const catalog = await this.loadCatalog();
    return catalog.metadata.section_types;
  }

  async getModuleById(id: string): Promise<any | null> {
    const catalog = await this.loadCatalog();
    return catalog.modules.find(module => module.unique_id === id) || null;
  }

  getImageUrl(imagePath: string): string {
    return `/processed_modules/${imagePath}`;
  }

  async getMostUsedTypes(): Promise<Array<{ type: string; count: number }>> {
    const patterns = await this.loadPatterns();
    return patterns.frequency_analysis.most_common_types.map(([type, count]) => ({
      type,
      count
    }));
  }
}

export const moduleService = new ModuleService();