import { ModuleCatalog, PatternAnalysis, LayoutTemplate, ModuleSection } from '../types';

interface ModuleWithQuality extends ModuleSection {
  qualityScore: number;
}

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

  // Quality scoring for modules
  private calculateQualityScore(module: any): number {
    const width = module.coordinates?.width || 0;
    const height = module.coordinates?.height || 0;
    const area = width * height;

    // Base quality score on resolution
    let qualityScore = 0;

    // High resolution threshold (good for hero/prominent sections)
    if (area > 500000) qualityScore = 5;
    // Medium resolution (good for most sections)
    else if (area > 200000) qualityScore = 4;
    // Low-medium resolution (acceptable for secondary content)
    else if (area > 100000) qualityScore = 3;
    // Low resolution (use sparingly)
    else if (area > 50000) qualityScore = 2;
    // Very low resolution (avoid in prominent positions)
    else qualityScore = 1;

    // Bonus for good aspect ratios
    if (width > 0 && height > 0) {
      const aspectRatio = width / height;
      // Prefer standard web aspect ratios
      if (aspectRatio >= 1.5 && aspectRatio <= 2.5) qualityScore += 0.5;
    }

    return qualityScore;
  }

  async getModulesByType(type: string, minQuality: number = 3): Promise<ModuleWithQuality[]> {
    const catalog = await this.loadCatalog();
    let modules = catalog.modules.filter(module => module.type === type);

    // Add quality scores and filter
    const modulesWithQuality = modules.map(module => ({
      ...module,
      qualityScore: this.calculateQualityScore(module)
    } as ModuleWithQuality)).filter(module => module.qualityScore >= minQuality);

    // Sort by quality (highest first)
    return modulesWithQuality.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  async getHighQualityModulesByType(type: string): Promise<ModuleWithQuality[]> {
    return this.getModulesByType(type, 4); // Only high quality modules
  }

  async searchModules(query: string, minQuality: number = 3): Promise<ModuleWithQuality[]> {
    const catalog = await this.loadCatalog();
    const lowerQuery = query.toLowerCase();

    let modules = catalog.modules.filter(module =>
      module.type.toLowerCase().includes(lowerQuery) ||
      module.name.toLowerCase().includes(lowerQuery) ||
      module.source_file.toLowerCase().includes(lowerQuery)
    );

    // Add quality scores and filter
    const modulesWithQuality = modules.map(module => ({
      ...module,
      qualityScore: this.calculateQualityScore(module)
    } as ModuleWithQuality)).filter(module => module.qualityScore >= minQuality);

    // Sort by quality (highest first)
    return modulesWithQuality.sort((a, b) => b.qualityScore - a.qualityScore);
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

  // Special method for high-quality navigation modules
  async getBestNavigationModules(): Promise<ModuleWithQuality[]> {
    const navigationModules = await this.getModulesByType('navigation', 2); // Lower threshold for navigation

    // Additional filtering for navigation-specific quality
    return navigationModules.filter(module => {
      const width = module.coordinates?.width || 0;
      const height = module.coordinates?.height || 0;

      // Navigation should be wide and not too tall
      const aspectRatio = width / height;
      const isGoodNavigation = aspectRatio > 3 && width > 800; // Wide navigation bars

      return isGoodNavigation;
    }).slice(0, 10); // Return top 10 best navigation modules
  }

  // Special method for hero sections (always use highest quality)
  async getBestHeroModules(): Promise<ModuleWithQuality[]> {
    return this.getModulesByType('hero', 4); // Only highest quality for hero
  }

  // Context-aware module selection
  async getModulesForContext(type: string, context: 'hero' | 'prominent' | 'secondary' | 'filler'): Promise<ModuleWithQuality[]> {
    switch (context) {
      case 'hero':
        return type === 'navigation' ? this.getBestNavigationModules() :
               type === 'hero' ? this.getBestHeroModules() :
               this.getModulesByType(type, 5); // Highest quality
      case 'prominent':
        return type === 'navigation' ? this.getBestNavigationModules() :
               this.getModulesByType(type, 4); // High quality
      case 'secondary':
        return this.getModulesByType(type, 3); // Medium quality
      case 'filler':
        return this.getModulesByType(type, 2); // Lower quality acceptable
      default:
        return this.getModulesByType(type, 3); // Default medium quality
    }
  }
}

export const moduleService = new ModuleService();