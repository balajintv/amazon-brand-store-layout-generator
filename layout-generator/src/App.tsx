import React, { useState, useEffect, useRef } from 'react';
import { ModuleSection, ViewMode, DestinationContext, ModuleWithQuality } from './types';
import { moduleService } from './services/moduleService';
import { Zap, Save, Download, Shuffle, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';

interface GeneratedLayout {
  id: string;
  name: string;
  sections: ModuleWithQuality[];
  created: string;
  totalHeight: number;
}

function App() {
  // Default navigation module using the static image
  const defaultNavigationModule: ModuleWithQuality = {
    id: 'default-navigation',
    type: 'navigation',
    name: 'Default Navigation',
    coordinates: {
      x: 0,
      y: 0,
      width: 1200,
      height: 80
    },
    area: 96000,
    center: { x: 600, y: 40 },
    unique_id: 'default_navigation_001',
    source_file: 'Screenshot from 2025-09-30 10-08-04.png',
    cropped_files: {
      full: 'images/Screenshot from 2025-09-30 10-08-04.png',
      medium: 'images/Screenshot from 2025-09-30 10-08-04.png',
      thumbnail: 'images/Screenshot from 2025-09-30 10-08-04.png',
      dimensions: {
        original: { width: 1200, height: 80 },
        medium: { width: 1200, height: 80 },
        thumbnail: { width: 1200, height: 80 }
      }
    },
    processing_date: new Date().toISOString(),
    qualityScore: 5 // High quality for default navigation
  };

  const [modules, setModules] = useState<ModuleWithQuality[]>([]);
  const [currentLayout, setCurrentLayout] = useState<GeneratedLayout | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<GeneratedLayout[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, start with sidebar closed
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadModules();
  }, []);

  // Helper function for simple quality scoring (sync version)
  const calculateSimpleQualityScore = (module: ModuleSection): number => {
    const width = module.coordinates?.width || 0;
    const height = module.coordinates?.height || 0;
    const area = width * height;

    if (area > 500000) return 5;
    if (area > 200000) return 4;
    if (area > 100000) return 3;
    if (area > 50000) return 2;
    return 1;
  };

  // Helper function for simple destination fit scoring (sync version)
  const calculateSimpleDestinationFit = (module: ModuleSection, destination: DestinationContext): number => {
    const sourceWidth = module.coordinates?.width || 0;
    const sourceHeight = module.coordinates?.height || 0;
    const sourceArea = sourceWidth * sourceHeight;
    const sourceAspectRatio = sourceHeight > 0 ? sourceWidth / sourceHeight : 0;

    const destArea = destination.width * destination.height;
    const destAspectRatio = destination.height > 0 ? destination.width / destination.height : 0;

    const scalingFactor = destArea / sourceArea;
    const aspectRatioDiff = Math.abs(sourceAspectRatio - destAspectRatio);

    let fitScore = 5;

    // Penalize upscaling
    if (scalingFactor > 4) fitScore -= 3;
    else if (scalingFactor > 2) fitScore -= 2;
    else if (scalingFactor > 1.5) fitScore -= 1;

    // Penalize aspect ratio mismatch
    if (aspectRatioDiff > 1.0) fitScore -= 2;
    else if (aspectRatioDiff > 0.5) fitScore -= 1;

    return Math.max(0, Math.min(5, fitScore));
  };

  const loadModules = async () => {
    try {
      const catalog = await moduleService.loadCatalog();
      // Add quality scores to loaded modules
      const modulesWithQuality = catalog.modules.map(module => ({
        ...module,
        qualityScore: calculateSimpleQualityScore(module)
      } as ModuleWithQuality));
      setModules(modulesWithQuality);
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
  };

  const generateLayout = async () => {
    if (modules.length === 0) return;

    setIsGenerating(true);

    // Simulate generation time for better UX
    await new Promise(resolve => setTimeout(resolve, 1000));

    const layoutSections = createIntelligentLayout();
    const newLayout: GeneratedLayout = {
      id: `layout_${Date.now()}`,
      name: `Generated Layout ${generationCount + 1}`,
      sections: layoutSections,
      created: new Date().toISOString(),
      totalHeight: calculateLayoutHeight(layoutSections)
    };

    setCurrentLayout(newLayout);
    setGenerationCount(prev => prev + 1);
    setIsGenerating(false);

    // Auto-collapse sidebar on mobile after generation
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const createIntelligentLayout = (): ModuleWithQuality[] => {
    const layoutSections: ModuleWithQuality[] = [];
    // Ensure minimum 10 non-heading sections (plus headings), max 25 total
    const contentSectionCount = Math.floor(Math.random() * 16) + 10; // 10-25 content sections

    // HYBRID APPROACH: Zone planning with multi-column support
    // Define section type priorities - reorganized for better structure
    const sectionRules = {
      header: ['mast', 'navigation'],
      hero: ['hero', 'video'],
      // High-priority interactive sections (use more often)
      highPriority: ['product_selector', 'category_carousel', 'reels', 'bestsellers'],
      // Multi-column friendly types (Tier 1 - excellent for multi-column)
      multiColumnTier1: ['shop_the_look'],
      // Multi-column friendly types (Tier 2 - conditional multi-column)
      multiColumnTier2: ['static_image', 'linkout_image', 'text_block'],
      // Before/after gets special treatment
      comparison: ['before_after'],
      // Visual content types (single column only)
      visual: ['video'],
      // Social proof
      social: ['testimonial'],
      // Product sections
      products: ['asin_waterfall', 'product_grid']
    };

    // ZONE PLANNING: Count available multi-column sections
    const availableMultiColumnTier1 = sectionRules.multiColumnTier1.reduce((count, type) => {
      return count + modules.filter(m => m.type === type).length;
    }, 0);

    const availableMultiColumnTier2 = sectionRules.multiColumnTier2.reduce((count, type) => {
      return count + modules.filter(m => m.type === type).length;
    }, 0);

    // Plan multi-column zones based on availability (adjusted for realistic dataset)
    const planMultiColumnZones = (): Array<{position: number, sections: number}> => {
      const zones: Array<{position: number, sections: number}> = [];
      const totalAvailable = availableMultiColumnTier1 + availableMultiColumnTier2;

      console.log(`Multi-column planning: Tier1=${availableMultiColumnTier1}, Tier2=${availableMultiColumnTier2}, Total=${totalAvailable}`);

      if (totalAvailable >= 6) {
        // Plan 2 multi-column zones with mixed content
        zones.push({position: 3, sections: 3}); // Primary zone: positions 3-5
        zones.push({position: 7, sections: 3}); // Secondary zone: positions 7-9
      } else if (totalAvailable >= 4) {
        // Plan 1 larger multi-column zone
        zones.push({position: 4, sections: 4}); // Zone: positions 4-7
      } else if (totalAvailable >= 3) {
        // Plan 1 medium multi-column zone
        zones.push({position: 4, sections: 3}); // Zone: positions 4-6
      } else if (totalAvailable >= 2) {
        // Plan 1 small multi-column zone
        zones.push({position: 4, sections: 2}); // Zone: positions 4-5
      }

      console.log(`Planned ${zones.length} multi-column zones:`, zones);
      return zones;
    };

    const multiColumnZones = planMultiColumnZones();

    // Always start with header sections
    const headerTypes = sectionRules.header;
    for (const type of headerTypes) {
      if (type === 'navigation') {
        // Use default navigation instead of dynamic selection
        layoutSections.push(defaultNavigationModule);
      } else {
        const headerSection = getRandomSectionByType(type, 'hero'); // Use highest quality for headers
        if (headerSection) layoutSections.push(headerSection);
      }
    }

    // Add a hero section
    const heroSection = getRandomSectionByType(sectionRules.hero[Math.floor(Math.random() * sectionRules.hero.length)], 'hero');
    if (heroSection) layoutSections.push(heroSection);

    // ZONE-BASED LAYOUT GENERATION with smart heading reduction
    let contentSectionsAdded = 0;
    let currentPosition = 2; // Start after header + hero
    const usedSections = new Set<string>();

    // Helper function to check if current position is in a multi-column zone
    const isInMultiColumnZone = (position: number): {inZone: boolean, zone?: {position: number, sections: number}} => {
      for (const zone of multiColumnZones) {
        if (position >= zone.position && position < zone.position + zone.sections) {
          return {inZone: true, zone};
        }
      }
      return {inZone: false};
    };

    // Helper function to add multi-column sections for a zone
    const addMultiColumnZone = (zone: {position: number, sections: number}): void => {
      // Add a section heading to introduce the multi-column zone
      const heading = getRandomSectionByType('section_heading', 'secondary');
      if (heading) {
        layoutSections.push(heading);
      }

      // Collect tier 1 multi-column sections first
      const tier1Sections: ModuleWithQuality[] = [];
      console.log(`Adding multi-column zone - looking for Tier 1 types:`, sectionRules.multiColumnTier1);

      for (const type of sectionRules.multiColumnTier1) {
        while (tier1Sections.length < zone.sections && tier1Sections.length < 3) {
          const section = getRandomSectionByType(type);
          console.log(`Tier 1: Found section of type ${type}:`, section ? section.type : 'null');

          if (section && !tier1Sections.some(s => s.unique_id === section.unique_id)) {
            tier1Sections.push(section);
            console.log(`Added Tier 1 section: ${section.type} (${section.unique_id})`);
          } else {
            break; // No more unique sections of this type
          }
        }
      }
      console.log(`Collected ${tier1Sections.length} Tier 1 sections`);

      // Fill remaining slots with tier 2 sections if needed
      const tier2Sections: ModuleWithQuality[] = [];
      if (tier1Sections.length < zone.sections) {
        const remainingSlots = zone.sections - tier1Sections.length;
        console.log(`Need ${remainingSlots} more sections, looking for Tier 2 types:`, sectionRules.multiColumnTier2);

        for (const type of sectionRules.multiColumnTier2) {
          while (tier2Sections.length < remainingSlots) {
            const section = getRandomSectionByType(type);
            console.log(`Tier 2: Found section of type ${type}:`, section ? section.type : 'null');

            if (section &&
                !tier2Sections.some(s => s.unique_id === section.unique_id) &&
                !tier1Sections.some(s => s.unique_id === section.unique_id)) {

              const isCandidate = isMobileMultiColumnCandidate(section);
              console.log(`Tier 2 section ${section.type} multi-column candidate: ${isCandidate}`);

              if (isCandidate) {
                tier2Sections.push(section);
                console.log(`Added Tier 2 section: ${section.type} (${section.unique_id})`);
              } else {
                console.log(`Rejected Tier 2 section ${section.type} - failed candidate test`);
              }
            } else {
              break; // No more suitable sections of this type
            }
          }
        }
        console.log(`Collected ${tier2Sections.length} Tier 2 sections`);
      }

      // Add the collected sections (NO section headings between them)
      const zoneContent = [...tier1Sections, ...tier2Sections];
      console.log(`Final zone content: ${zoneContent.length} sections:`, zoneContent.map(s => s.type));

      for (const section of zoneContent) {
        layoutSections.push(section);
        contentSectionsAdded++;
        usedSections.add(section.type);
        console.log(`Added zone section to layout: ${section.type}`);
      }

      console.log(`Zone complete. Total sections in layout: ${layoutSections.length}`);
      currentPosition += zone.sections;
    };

    // Generate content using zone-based approach
    while (contentSectionsAdded < contentSectionCount) {
      const zoneCheck = isInMultiColumnZone(currentPosition);

      if (zoneCheck.inZone && zoneCheck.zone) {
        // We're entering a multi-column zone
        addMultiColumnZone(zoneCheck.zone);
        continue;
      }

      // Regular single-column content with normal section heading logic
      if (contentSectionsAdded < contentSectionCount - 1) {
        // Add section heading before single-column content
        const heading = getRandomSectionByType('section_heading', 'secondary');
        if (heading) {
          layoutSections.push(heading);
        }
      }

      if (contentSectionsAdded >= contentSectionCount) break;

      // Choose content type for single-column sections
      let contentType: string;
      const availableTypes = [
        ...sectionRules.highPriority,
        ...sectionRules.comparison,
        ...sectionRules.visual,
        ...sectionRules.social,
        ...sectionRules.products
      ].filter(type => !usedSections.has(type) || usedSections.size >= 6);

      if (availableTypes.length > 0) {
        contentType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      } else {
        // Fallback to high priority types
        contentType = sectionRules.highPriority[Math.floor(Math.random() * sectionRules.highPriority.length)];
      }

      // Get section and add to layout
      const section = getRandomSectionByType(contentType);
      if (section) {
        layoutSections.push(section);
        contentSectionsAdded++;
        usedSections.add(contentType);
      }

      currentPosition++;

      // Clear used sections tracking periodically for variety
      if (usedSections.size >= 8) {
        usedSections.clear();
      }
    }

    return layoutSections;
  };

  const getRandomSectionByType = (type: string, context: 'hero' | 'prominent' | 'secondary' | 'filler' = 'secondary'): ModuleWithQuality | null => {
    // Return default navigation for navigation requests
    if (type === 'navigation') {
      return defaultNavigationModule;
    }

    // Calculate destination context for enhanced selection
    const getDestinationContext = (): DestinationContext => {
      let width = 375; // Default mobile width
      let height = 200; // Default height

      // Adjust based on view mode
      if (viewMode === 'desktop') {
        width = 1200;
        height = context === 'hero' ? 400 : 300;
      } else if (viewMode === 'tablet') {
        width = 768;
        height = context === 'hero' ? 300 : 250;
      } else {
        width = 375;
        height = context === 'hero' ? 200 : 150;
      }

      // Adjust height based on section type
      if (type === 'navigation' || type === 'mast') {
        height = Math.min(height * 0.3, 100); // Navigation is typically shorter
      } else if (type === 'section_heading') {
        height = Math.min(height * 0.4, 120); // Headings are shorter
      }

      return {
        width,
        height,
        viewMode,
        usage: context,
        position: context === 'hero' ? 'header' : 'content'
      };
    };

    const destination = getDestinationContext();

    // Use enhanced destination-aware selection
    try {
      let sectionsOfType = modules.filter(module => module.type === type);
      if (sectionsOfType.length === 0) return null;

      // Apply enhanced quality filtering
      const enhancedSections = sectionsOfType.map(module => {
        // Module already has qualityScore from loadModules, just add destinationFitScore
        const destinationFitScore = calculateSimpleDestinationFit(module, destination);

        return {
          ...module,
          destinationFitScore
        } as ModuleWithQuality;
      }).filter(module => {
        // Filter by minimum quality based on context
        const minQuality = context === 'hero' ? 4 : context === 'prominent' ? 3 : 2;
        if ((module.qualityScore || 0) < minQuality) return false;

        // Filter by destination fit (avoid heavily stretched images)
        if ((module.destinationFitScore || 0) < 2) return false;

        return true;
      });

      if (enhancedSections.length === 0) {
        // Fallback to original logic if enhanced filtering is too restrictive
        // sectionsOfType already has qualityScore, just cast to ModuleWithQuality
        return sectionsOfType[Math.floor(Math.random() * sectionsOfType.length)] || null;
      }

      // Sort by combined score and pick randomly from top candidates
      const sortedSections = enhancedSections.sort((a, b) => {
        const scoreA = (a.qualityScore || 0) + (a.destinationFitScore || 0);
        const scoreB = (b.qualityScore || 0) + (b.destinationFitScore || 0);
        return scoreB - scoreA;
      });

      // Pick randomly from top candidates for variety
      // Use larger pool for section headings to improve variety
      const candidatePoolSize = type === 'section_heading' ? 8 : 3;
      const topCandidates = sortedSections.slice(0, Math.min(candidatePoolSize, sortedSections.length));
      return topCandidates[Math.floor(Math.random() * topCandidates.length)];

    } catch (error) {
      console.warn('Enhanced selection failed, falling back to basic selection:', error);
      // Fallback to original logic
      const basicSections = modules.filter(module => module.type === type);
      if (basicSections.length === 0) return null;
      return {
        ...basicSections[Math.floor(Math.random() * basicSections.length)],
        qualityScore: 3
      } as ModuleWithQuality;
    }
  };

  const calculateLayoutHeight = (sections: ModuleWithQuality[]): number => {
    return sections.reduce((total, section) => {
      return total + section.coordinates.height;
    }, 0);
  };

  const saveLayoutAsImage = async () => {
    if (!layoutRef.current || !currentLayout) return;

    try {
      // Create canvas from the layout element
      const canvas = await html2canvas(layoutRef.current, {
        background: '#ffffff',
        useCORS: true,
        allowTaint: true,
        height: layoutRef.current.scrollHeight,
        width: layoutRef.current.scrollWidth
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${currentLayout.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_layout.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Failed to save layout as image:', error);
      alert('Failed to save layout as image. Please try again.');
    }
  };

  const saveLayout = () => {
    if (!currentLayout) return;

    setSavedLayouts(prev => [...prev, currentLayout]);
    alert('Layout saved successfully!');
  };

  const loadSavedLayout = (layout: GeneratedLayout) => {
    setCurrentLayout(layout);
  };

  // NEW FEATURE: Mobile brick-wall/stacked layout (rollback ready)
  const isMobileMultiColumnCandidate = (section: ModuleWithQuality): boolean => {
    // Analyze coordinates to determine if section was likely multi-column in original
    const { width, height, x, y } = section.coordinates;
    const aspectRatio = width / height;

    // FIXED: More inclusive criteria for multi-column layout
    // Focus on content suitability rather than original positioning

    // 1. Good aspect ratios for stacking (not too tall/thin, not too wide/flat)
    const isGoodStackingRatio = aspectRatio >= 0.4 && aspectRatio <= 3.0; // More inclusive range

    // 2. Multi-column friendly content types (using correct dataset types)
    const isMultiColumnFriendlyType = [
      'text_block', 'shop_the_look', 'static_image', 'linkout_image'
    ].includes(section.type);

    // Tier 1: Excellent for multi-column (prioritize these)
    const isTier1MultiColumn = ['shop_the_look'].includes(section.type);

    // Tier 2: Conditional multi-column (stricter requirements)
    const isTier2MultiColumn = ['static_image', 'linkout_image', 'text_block'].includes(section.type);

    // 3. Exclude sections that should always be full-width
    const shouldAlwaysBeFullWidth = [
      'mast', 'navigation', 'hero', 'video', 'section_heading'
    ].includes(section.type);

    // 4. Size suitability - sections that work well when subdivided
    const hasGoodSizeForColumns = width >= 200 && height >= 100; // Lower size requirements

    // 5. Consider sections with reasonable dimensions for mobile stacking
    const isMobileStackingFriendly = height >= 150 && height <= 600; // Good height range for mobile

    // Enhanced selection logic with tier-based requirements
    if (shouldAlwaysBeFullWidth) return false;
    if (!isMultiColumnFriendlyType) return false;
    if (!isMobileStackingFriendly) return false;

    // Tier 1 types: More lenient requirements (excellent for multi-column)
    if (isTier1MultiColumn) {
      return isGoodStackingRatio && hasGoodSizeForColumns;
    }

    // Tier 2 types: Relaxed requirements to work with actual dataset
    if (isTier2MultiColumn) {
      const isGoodForColumns = aspectRatio >= 0.7 && aspectRatio <= 2.5; // More flexible range
      const isReasonableSize = width >= 200 && height >= 100; // Lower minimum size
      const isNotTooWide = aspectRatio <= 3.0; // Prevent very wide images

      console.log(`Tier 2 section ${section.type} dimensions: ${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)}`);
      console.log(`  - isGoodForColumns (0.7-2.5): ${isGoodForColumns}`);
      console.log(`  - isReasonableSize (>=200x100): ${isReasonableSize}`);
      console.log(`  - isNotTooWide (<=3.0): ${isNotTooWide}`);
      console.log(`  - final result: ${isGoodForColumns && isReasonableSize && isNotTooWide}`);

      return isGoodForColumns && isReasonableSize && isNotTooWide;
    }

    return false;
  };

  // NEW: Create brick-wall layout groups
  const createBrickWallGroups = (sections: ModuleWithQuality[]): Array<{ type: 'single' | 'brick', sections: ModuleWithQuality[] }> => {
    console.log(`Creating brick wall groups for ${sections.length} sections`);
    console.log('Section types:', sections.map(s => s.type));

    const groups: Array<{ type: 'single' | 'brick', sections: ModuleWithQuality[] }> = [];
    let i = 0;

    while (i < sections.length) {
      const section = sections[i];

      // Always keep headers/heroes as single
      if (['mast', 'navigation', 'hero', 'video', 'section_heading'].includes(section.type)) {
        groups.push({ type: 'single', sections: [section] });
        console.log(`Added single group for ${section.type}`);
        i++;
        continue;
      }

      // Check if this and next sections can form a brick group
      const isCandidate = isMobileMultiColumnCandidate(section);
      console.log(`Section ${section.type} is multi-column candidate: ${isCandidate}`);

      if (isCandidate) {
        const brickGroup: ModuleWithQuality[] = [section];
        console.log(`Starting brick group with ${section.type}`);

        // Look ahead for 1-3 more sections to create brick pattern
        let j = i + 1;
        while (j < sections.length && brickGroup.length < 4) {
          const nextSection = sections[j];

          // Stop if we hit a header/hero
          if (['mast', 'navigation', 'hero', 'video', 'section_heading'].includes(nextSection.type)) {
            break;
          }

          // Add if it's stackable
          if (isMobileMultiColumnCandidate(nextSection)) {
            brickGroup.push(nextSection);
            j++;
          } else {
            break;
          }
        }

        // Create brick group if we have 2+ sections, otherwise single
        if (brickGroup.length >= 2) {
          groups.push({ type: 'brick', sections: brickGroup });
          console.log(`Created BRICK group with ${brickGroup.length} sections:`, brickGroup.map(s => s.type));
          i = j;
        } else {
          groups.push({ type: 'single', sections: [section] });
          console.log(`Added single group for ${section.type} (couldn't form brick group)`);
          i++;
        }
      } else {
        groups.push({ type: 'single', sections: [section] });
        console.log(`Added single group for ${section.type} (not candidate)`);
        i++;
      }
    }

    console.log(`Final brick wall groups: ${groups.length} groups, ${groups.filter(g => g.type === 'brick').length} are brick groups`);
    return groups;
  };

  // NEW: Render brick-wall pattern
  const renderBrickGroup = (group: ModuleWithQuality[], groupIndex: number) => {
    if (group.length === 2) {
      // Simple 2-column
      return (
        <div key={`brick-${groupIndex}`} className="flex" style={{ marginBottom: '-2px' }}>
          {group.map((section, idx) => (
            <div key={`${section.unique_id}_${groupIndex}_${idx}`} className="w-1/2 relative">
              {renderSectionImage(section, true, `${groupIndex}_${idx}`)}
            </div>
          ))}
        </div>
      );
    } else if (group.length === 3) {
      // Brick pattern: 1 large + 2 stacked
      return (
        <div key={`brick-${groupIndex}`} className="flex" style={{ marginBottom: '-2px' }}>
          <div className="w-1/2 relative">
            {renderSectionImage(group[0], true, `${groupIndex}_0`)}
          </div>
          <div className="w-1/2 flex flex-col">
            {group.slice(1).map((section, idx) => (
              <div key={`${section.unique_id}_${groupIndex}_${idx + 1}`} className="relative" style={{ height: '50%' }}>
                {renderSectionImage(section, true, `${groupIndex}_${idx + 1}`, { height: '100%' })}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (group.length === 4) {
      // 2x2 grid
      return (
        <div key={`brick-${groupIndex}`} className="grid grid-cols-2" style={{ marginBottom: '-2px' }}>
          {group.map((section, idx) => (
            <div key={`${section.unique_id}_${groupIndex}_${idx}`} className="relative">
              {renderSectionImage(section, true, `${groupIndex}_${idx}`)}
            </div>
          ))}
        </div>
      );
    }

    // Fallback single
    return (
      <div key={`brick-${groupIndex}`} className="relative" style={{ marginBottom: '-2px' }}>
        {renderSectionImage(group[0], false, `${groupIndex}_0`)}
      </div>
    );
  };

  // NEW: Render individual section image
  const renderSectionImage = (section: ModuleWithQuality, isInBrick: boolean, key: string, extraStyle: React.CSSProperties = {}) => {
    return (
      <>
        <img
          src={moduleService.getSmartImageUrl(section, viewMode)}
          alt={section.name}
          className={getSectionImageClass(section, viewMode, isInBrick)}
          style={{
            ...getSectionImageStyle(section, viewMode, isInBrick),
            ...extraStyle,
            display: 'block',
            width: '100%'
          }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNjY2MiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz48L3N2Zz4=';
          }}
        />
        <div className="absolute top-1 left-1 bg-black bg-opacity-70 text-white px-1 py-0.5 rounded text-xs" style={{ fontSize: isInBrick ? '9px' : '12px' }}>
          {section.type.replace('_', ' ').toUpperCase()}
        </div>
      </>
    );
  };

  const getSectionImageClass = (section: ModuleWithQuality, viewMode: ViewMode, isInBrick: boolean = false): string => {
    const { width, height } = section.coordinates;
    const aspectRatio = width / height;
    const sectionType = section.type;

    // Base classes for different section types
    const baseClasses = "block w-full";

    // Content-aware sizing - smart object fitting
    if (sectionType === 'mast' || sectionType === 'navigation') {
      return `${baseClasses} object-cover`; // Cover for header elements
    }

    if (sectionType === 'hero' || sectionType === 'video') {
      return `${baseClasses} object-cover`; // Cover for hero content
    }

    if (sectionType === 'section_heading') {
      return `${baseClasses} object-contain`; // Contain to preserve text readability
    }

    // For brick layout, be more aggressive with cropping to ensure good fit
    if (isInBrick) {
      return `${baseClasses} object-cover`; // Crop for visual appeal in brick layout
    }

    // For most content sections, use object-contain to ensure nothing gets cut off
    // Only use object-cover for sections that benefit from it
    if (['linkout_image', 'static_image'].includes(sectionType)) {
      return `${baseClasses} object-cover`; // Images can be cropped for visual appeal
    } else {
      return `${baseClasses} object-contain`; // Preserve all content for interactive sections
    }
  };

  const getSectionImageStyle = (section: ModuleWithQuality, viewMode: ViewMode, isInBrick: boolean = false): React.CSSProperties => {
    const { width, height } = section.coordinates;
    const aspectRatio = width / height;
    const sectionType = section.type;

    // Base style object
    const baseStyle: React.CSSProperties = {
      objectPosition: 'center',
      backgroundColor: 'transparent',
    };

    // Content-aware height calculations with better fitting
    if (sectionType === 'section_heading') {
      // Headings should be compact and auto-fit
      return {
        ...baseStyle,
        height: 'auto',
        minHeight: viewMode === 'mobile' ? '40px' : '50px',
        maxHeight: viewMode === 'mobile' ? '80px' : '100px',
      };
    }

    if (sectionType === 'text_block') {
      // Text blocks need to maintain readability with proper aspect ratio
      const textHeight = Math.min(width / aspectRatio, viewMode === 'mobile' ? 250 : 350);
      return {
        ...baseStyle,
        height: `${textHeight}px`,
      };
    }

    // Calculate viewport-aware heights that maintain aspect ratio
    let viewportWidth: number;
    let maxAllowedHeight: number;

    switch (viewMode) {
      case 'mobile':
        viewportWidth = isInBrick ? 187.5 : 375; // Half width for brick layout
        maxAllowedHeight = isInBrick ? 200 : 400; // Smaller height for brick
        break;
      case 'desktop':
      default:
        viewportWidth = 1200;
        maxAllowedHeight = 600;
        break;
    }

    // Calculate height that maintains aspect ratio within viewport
    const idealHeight = viewportWidth / aspectRatio;

    // Apply content-type specific height limits
    let contentMaxHeight: number;
    if (sectionType === 'hero' || sectionType === 'video') {
      contentMaxHeight = maxAllowedHeight;
    } else if (['product_selector', 'category_carousel', 'shop_the_look', 'reels'].includes(sectionType)) {
      contentMaxHeight = maxAllowedHeight * 0.8;
    } else if (['testimonial', 'before_after'].includes(sectionType)) {
      contentMaxHeight = maxAllowedHeight * 0.7;
    } else if (['linkout_image', 'static_image'].includes(sectionType)) {
      contentMaxHeight = maxAllowedHeight * 0.9;
    } else {
      contentMaxHeight = maxAllowedHeight * 0.8;
    }

    // Use the smaller of ideal height or content max height
    const finalHeight = Math.min(idealHeight, contentMaxHeight);

    // Ensure minimum height for very wide sections
    const minHeight = viewMode === 'mobile' ? 60 : 80;

    return {
      ...baseStyle,
      height: `${Math.max(finalHeight, minHeight)}px`,
    };
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Header */}
      <header className="amazon-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-white hover:bg-opacity-10 rounded"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2">
              <Zap className="amazon-orange-text" size={isMobile ? 20 : 24} />
              <h1 className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                {isMobile ? 'Layout Generator' : 'Amazon Brand Store Layout Generator'}
              </h1>
            </div>

            {!isMobile && (
              <div className="text-sm opacity-75">
                Automatically generate professional brand store layouts
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={generateLayout}
              disabled={isGenerating || modules.length === 0}
              className={`btn btn-primary ${isMobile ? 'px-3 py-2 text-sm' : ''}`}
            >
              {isGenerating ? (
                <>
                  <div className="loading-spinner"></div>
                  {!isMobile && 'Generating...'}
                </>
              ) : (
                <>
                  <Shuffle size={isMobile ? 14 : 16} />
                  {isMobile ? 'Generate' : 'Generate Layout'}
                </>
              )}
            </button>

            {!isMobile && (
              <>
                <button
                  onClick={saveLayout}
                  disabled={!currentLayout}
                  className="btn btn-success"
                >
                  <Save size={16} />
                  Save Layout
                </button>

                <button
                  onClick={saveLayoutAsImage}
                  disabled={!currentLayout}
                  className="btn btn-secondary"
                >
                  <Download size={16} />
                  Save as Image
                </button>
              </>
            )}

            {/* Mobile Actions Menu */}
            {isMobile && currentLayout && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="btn btn-secondary px-2 py-2 text-sm"
              >
                <Save size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 relative">
        {/* No sidebar toggle arrow on mobile - use hamburger menu only */}

        {/* Sidebar Overlay (Mobile) */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {(!isMobile || sidebarOpen) && (
          <div
            className={`
              ${isMobile ? 'fixed left-0 top-16 h-full z-30 bg-white' : 'relative'}
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              sidebar transition-transform duration-300 ease-in-out
            `}
          >
          {/* Sidebar Close Button (Mobile) */}
          {isMobile && (
            <div className="p-2 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold amazon-blue-text">Controls</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* View Mode Controls */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold amazon-blue-text mb-3">View Mode</h3>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              {(['mobile', 'desktop'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-sm capitalize flex-1 ${
                    viewMode === mode
                      ? 'amazon-orange-bg text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Actions */}
          {isMobile && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold amazon-blue-text mb-3">Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={saveLayout}
                  disabled={!currentLayout}
                  className="btn btn-success w-full text-sm"
                >
                  <Save size={14} />
                  Save Layout
                </button>
                <button
                  onClick={saveLayoutAsImage}
                  disabled={!currentLayout}
                  className="btn btn-secondary w-full text-sm"
                >
                  <Download size={14} />
                  Save as Image
                </button>
              </div>
            </div>
          )}

          {/* Layout Stats */}
          {currentLayout && (
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold amazon-blue-text mb-2">Layout Stats</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Sections: {currentLayout.sections.filter(s => s.type !== 'section_heading').length}</div>
                <div>Total Height: {Math.round(currentLayout.totalHeight)}px</div>
                <div>Generated: #{generationCount}</div>
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold amazon-blue-text mb-2">System Status</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Modules Available: {modules.length}</div>
              <div className="flex items-center gap-2">
                <div className="status-dot"></div>
                <span>Ready</span>
              </div>
            </div>
          </div>

          {/* Saved Layouts */}
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold amazon-blue-text">Saved Layouts</h2>
            <p className="text-sm text-gray-600">{savedLayouts.length} saved</p>
          </div>
          <div className="overflow-auto flex-1">
            {savedLayouts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No saved layouts yet.</p>
                <p className="text-xs mt-1">Generate and save layouts to see them here.</p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {savedLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    onClick={() => loadSavedLayout(layout)}
                    className="module-card p-3"
                  >
                    <h3 className="font-medium text-sm">{layout.name}</h3>
                    <p className="text-xs text-gray-500">{layout.sections.filter(s => s.type !== 'section_heading').length} sections</p>
                    <p className="text-xs text-gray-400">
                      {new Date(layout.created).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Layout Display */}
        <div className="main-content">
          <div className="canvas-container">
            {!currentLayout ? (
              <div className="canvas flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                    <Shuffle size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Generate Your First Layout
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-4">
                    Click "Generate Layout" to automatically create a professional brand store layout
                    using your processed modules. Each layout combines 5-20 sections intelligently.
                  </p>
                  <button
                    onClick={generateLayout}
                    disabled={isGenerating || modules.length === 0}
                    className="btn btn-primary"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Layout'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`canvas ${viewMode}`} ref={layoutRef}>
                <div className="flex flex-col">
                  {viewMode === 'mobile' ? (
                    // NEW: Mobile brick-wall layout
                    createBrickWallGroups(currentLayout.sections).map((group, groupIndex) => {
                      if (group.type === 'brick') {
                        return renderBrickGroup(group.sections, groupIndex);
                      } else {
                        // Single section
                        const section = group.sections[0];
                        return (
                          <div key={`single-${groupIndex}`} className="relative" style={{ marginBottom: '-2px' }}>
                            {renderSectionImage(section, false, `${groupIndex}_0`)}
                          </div>
                        );
                      }
                    })
                  ) : (
                    // Desktop/Tablet: Original single-column layout
                    currentLayout.sections.map((section, index) => (
                      <div key={`${section.unique_id}_${index}`} className="relative flex-shrink-0" style={{ marginBottom: '-2px' }}>
                        <img
                          src={moduleService.getSmartImageUrl(section, viewMode)}
                          alt={section.name}
                          className={getSectionImageClass(section, viewMode)}
                          style={{
                            ...getSectionImageStyle(section, viewMode),
                            display: 'block',
                            width: '100%'
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNjY2MiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiLz48L3N2Zz4=';
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                          {section.type.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
