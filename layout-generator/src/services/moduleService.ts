import { ModuleCatalog, PatternAnalysis, LayoutTemplate, ModuleSection, DestinationContext, ModuleWithQuality } from '../types';


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

  // Enhanced quality scoring for modules
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

  // NEW: Destination-aware quality scoring
  private calculateDestinationFitScore(module: any, destination: DestinationContext): number {
    const sourceWidth = module.coordinates?.width || 0;
    const sourceHeight = module.coordinates?.height || 0;
    const sourceArea = sourceWidth * sourceHeight;
    const sourceAspectRatio = sourceHeight > 0 ? sourceWidth / sourceHeight : 0;

    const destArea = destination.width * destination.height;
    const destAspectRatio = destination.height > 0 ? destination.width / destination.height : 0;

    // Calculate scaling factor (how much upscaling would be needed)
    const scalingFactor = destArea / sourceArea;

    let fitScore = 5;

    // Penalize heavy upscaling (causes blur/pixelation)
    if (scalingFactor > 4) fitScore -= 3;        // > 4x upscaling = major penalty
    else if (scalingFactor > 2) fitScore -= 2;   // > 2x upscaling = moderate penalty
    else if (scalingFactor > 1.5) fitScore -= 1; // > 1.5x upscaling = minor penalty

    // Penalize aspect ratio mismatch (causes stretching)
    const aspectRatioDiff = Math.abs(sourceAspectRatio - destAspectRatio);
    if (aspectRatioDiff > 1.0) fitScore -= 2;     // Major aspect ratio mismatch
    else if (aspectRatioDiff > 0.5) fitScore -= 1; // Minor aspect ratio mismatch

    // Bonus for good fit
    if (scalingFactor <= 1 && aspectRatioDiff <= 0.2) fitScore += 1;

    return Math.max(0, Math.min(5, fitScore));
  }

  // NEW: Get recommended image size based on destination
  private getRecommendedImageSize(module: any, destination: DestinationContext): 'full' | 'medium' | 'thumbnail' {
    const destArea = destination.width * destination.height;
    const moduleArea = (module.coordinates?.width || 0) * (module.coordinates?.height || 0);

    // For large destinations or hero sections, prefer full resolution
    if (destination.usage === 'hero' || destArea > 300000) {
      return 'full';
    }

    // For medium destinations, use medium images
    if (destArea > 50000) {
      return 'medium';
    }

    // For small destinations, thumbnails are sufficient
    return 'thumbnail';
  }

  // NEW: Context-aware resolution requirements
  private getMinResolutionForContext(destination: DestinationContext): number {
    switch (destination.usage) {
      case 'hero':
        return destination.viewMode === 'desktop' ? 800 * 400 :  // Desktop hero needs high-res
               destination.viewMode === 'tablet' ? 600 * 300 :   // Tablet hero medium-res
               300 * 200;                                        // Mobile hero lower-res
      case 'prominent':
        return destination.viewMode === 'desktop' ? 400 * 300 :
               200 * 150;
      case 'secondary':
        return 200 * 100;
      case 'filler':
        return 100 * 50;
      default:
        return 100 * 100;
    }
  }

  // NEW: Check aspect ratio compatibility
  private isAspectRatioCompatible(sourceAspectRatio: number, targetAspectRatio: number, tolerance: number = 0.3): boolean {
    const diff = Math.abs(sourceAspectRatio - targetAspectRatio);
    return diff <= tolerance;
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

  // NEW: Get modules with destination-aware filtering
  async getModulesForDestination(
    type: string,
    destination: DestinationContext,
    minQuality: number = 3
  ): Promise<ModuleWithQuality[]> {
    const catalog = await this.loadCatalog();
    let modules = catalog.modules.filter(module => module.type === type);

    const minResolution = this.getMinResolutionForContext(destination);
    const targetAspectRatio = destination.height > 0 ? destination.width / destination.height : 1;

    // Enhanced filtering with destination awareness
    const modulesWithScores = modules.map(module => {
      const qualityScore = this.calculateQualityScore(module);
      const destinationFitScore = this.calculateDestinationFitScore(module, destination);
      const recommendedImageSize = this.getRecommendedImageSize(module, destination);

      const moduleArea = (module.coordinates?.width || 0) * (module.coordinates?.height || 0);
      const moduleAspectRatio = (module.coordinates?.height || 0) > 0 ?
        (module.coordinates?.width || 0) / (module.coordinates?.height || 0) : 1;

      return {
        ...module,
        qualityScore,
        destinationFitScore,
        recommendedImageSize
      } as ModuleWithQuality;
    }).filter(module => {
      // Filter by base quality
      if (module.qualityScore < minQuality) return false;

      // Filter by minimum resolution requirement
      const moduleArea = (module.coordinates?.width || 0) * (module.coordinates?.height || 0);
      if (moduleArea < minResolution) return false;

      // Filter by destination fit score (avoid heavily stretched images)
      if ((module.destinationFitScore || 0) < 2) return false;

      // Filter by aspect ratio compatibility for critical sections
      if (destination.usage === 'hero' || destination.usage === 'prominent') {
        const moduleAspectRatio = (module.coordinates?.height || 0) > 0 ?
          (module.coordinates?.width || 0) / (module.coordinates?.height || 0) : 1;
        if (!this.isAspectRatioCompatible(moduleAspectRatio, targetAspectRatio)) {
          return false;
        }
      }

      return true;
    });

    // Sort by combined score (quality + destination fit)
    return modulesWithScores.sort((a, b) => {
      const scoreA = (a.qualityScore || 0) + (a.destinationFitScore || 0);
      const scoreB = (b.qualityScore || 0) + (b.destinationFitScore || 0);
      return scoreB - scoreA;
    });
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

  // NEW: Smart image URL with quality selection
  getSmartImageUrl(module: ModuleWithQuality, viewMode: 'mobile' | 'tablet' | 'desktop' = 'desktop'): string {
    // Choose image size based on view mode and module quality
    let imageSize: 'full' | 'medium' | 'thumbnail';

    if (viewMode === 'mobile') {
      // Mobile: use medium or thumbnail for better performance
      imageSize = (module.qualityScore || 0) >= 4 ? 'medium' : 'thumbnail';
    } else if (viewMode === 'tablet') {
      // Tablet: balance between quality and performance
      imageSize = (module.qualityScore || 0) >= 4 ? 'full' : 'medium';
    } else {
      // Desktop: prefer full for high-quality modules
      imageSize = (module.qualityScore || 0) >= 4 ? 'full' : 'medium';
    }

    const imagePath = imageSize === 'full' ? module.cropped_files.full :
                     imageSize === 'thumbnail' ? module.cropped_files.thumbnail :
                     module.cropped_files.medium;

    return `/processed_modules/${imagePath}`;
  }

  async getMostUsedTypes(): Promise<Array<{ type: string; count: number }>> {
    const patterns = await this.loadPatterns();
    return patterns.frequency_analysis.most_common_types.map(([type, count]) => ({
      type,
      count
    }));
  }

  // Note: Navigation modules are now handled by default navigation in App.tsx

  // Special method for hero sections (always use highest quality)
  async getBestHeroModules(): Promise<ModuleWithQuality[]> {
    return this.getModulesByType('hero', 4); // Only highest quality for hero
  }

  // Enhanced context-aware module selection with destination awareness
  async getModulesForContext(
    type: string,
    context: 'hero' | 'prominent' | 'secondary' | 'filler',
    destination?: DestinationContext
  ): Promise<ModuleWithQuality[]> {
    // If destination provided, use enhanced filtering
    if (destination) {
      const contextDestination = { ...destination, usage: context };

      switch (context) {
        case 'hero':
          return type === 'hero' ? this.getBestHeroModules() :
                 this.getModulesForDestination(type, contextDestination, 5);
        case 'prominent':
          return this.getModulesForDestination(type, contextDestination, 4);
        case 'secondary':
          return this.getModulesForDestination(type, contextDestination, 3);
        case 'filler':
          return this.getModulesForDestination(type, contextDestination, 2);
        default:
          return this.getModulesForDestination(type, contextDestination, 3);
      }
    }

    // Fallback to original logic if no destination provided
    switch (context) {
      case 'hero':
        return type === 'hero' ? this.getBestHeroModules() :
               this.getModulesByType(type, 5); // Highest quality
      case 'prominent':
        return this.getModulesByType(type, 4); // High quality
      case 'secondary':
        return this.getModulesByType(type, 3); // Medium quality
      case 'filler':
        return this.getModulesByType(type, 2); // Lower quality acceptable
      default:
        return this.getModulesByType(type, 3); // Default medium quality
    }
  }

  // NEW: Get optimal image path based on destination and module
  getOptimalImageUrl(module: ModuleWithQuality, destination?: DestinationContext): string {
    let imageSize: 'full' | 'medium' | 'thumbnail' = 'medium'; // default

    if (destination) {
      imageSize = this.getRecommendedImageSize(module, destination);
    } else if (module.recommendedImageSize) {
      imageSize = module.recommendedImageSize;
    }

    const imagePath = imageSize === 'full' ? module.cropped_files.full :
                     imageSize === 'thumbnail' ? module.cropped_files.thumbnail :
                     module.cropped_files.medium;

    return `/processed_modules/${imagePath}`;
  }
}

export const moduleService = new ModuleService();