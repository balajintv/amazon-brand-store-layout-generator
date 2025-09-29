import React, { useState, useEffect, useRef } from 'react';
import { ModuleSection, ViewMode } from './types';
import { moduleService } from './services/moduleService';
import { Zap, Save, Download, Shuffle, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import html2canvas from 'html2canvas';

interface GeneratedLayout {
  id: string;
  name: string;
  sections: ModuleSection[];
  created: string;
  totalHeight: number;
}

function App() {
  const [modules, setModules] = useState<ModuleSection[]>([]);
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

  const loadModules = async () => {
    try {
      const catalog = await moduleService.loadCatalog();
      setModules(catalog.modules);
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

  const createIntelligentLayout = (): ModuleSection[] => {
    const layoutSections: ModuleSection[] = [];
    // Ensure minimum 10 non-heading sections (plus headings), max 25 total
    const contentSectionCount = Math.floor(Math.random() * 16) + 10; // 10-25 content sections

    // Define section type priorities - reorganized for better structure
    const sectionRules = {
      header: ['mast', 'navigation'],
      hero: ['hero', 'video'],
      // High-priority interactive sections (use more often)
      highPriority: ['product_selector', 'category_carousel', 'reels', 'shop_the_look', 'bestsellers'],
      // Before/after gets special treatment
      comparison: ['before_after'],
      // Visual content types
      visual: ['static_image', 'linkout_image', 'video'],
      // Social proof
      social: ['testimonial'],
      // Product sections
      products: ['asin_waterfall', 'product_grid'],
      // Text content
      text: ['text_block']
    };

    // Always start with header sections
    const headerTypes = sectionRules.header;
    for (const type of headerTypes) {
      const headerSection = getRandomSectionByType(type, 'hero'); // Use highest quality for headers
      if (headerSection) layoutSections.push(headerSection);
    }

    // Add a hero section
    const heroSection = getRandomSectionByType(sectionRules.hero[Math.floor(Math.random() * sectionRules.hero.length)], 'hero');
    if (heroSection) layoutSections.push(heroSection);

    // Create content groups with MANDATORY headings as introducers
    let contentSectionsAdded = 0;
    let lastSectionType = '';
    let lastSection: ModuleSection | null = null;

    // Track section types to enforce variety
    const usedSections = new Set<string>();
    const singleColumnTypes = ['static_image', 'linkout_image', 'text_block', 'video', 'hero'];

    while (contentSectionsAdded < contentSectionCount) {
      // ENFORCE: Every content section must have a heading introducer
      if (contentSectionsAdded < contentSectionCount - 1) {
        // Add section heading as MANDATORY content introducer
        const heading = getRandomSectionByType('section_heading', 'prominent');
        if (heading) {
          layoutSections.push(heading);
          // Note: headings don't count toward content section count
          lastSectionType = 'section_heading';
          lastSection = heading;
        }
      }

      if (contentSectionsAdded >= contentSectionCount) break;

      // Choose content type with strict anti-duplication rules
      let contentType: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        const rand = Math.random();

        if (rand < 0.4) {
          // 40% chance for high-priority interactive sections
          contentType = sectionRules.highPriority[Math.floor(Math.random() * sectionRules.highPriority.length)];
        } else if (rand < 0.5) {
          // 10% chance for before/after (powerful but shouldn't dominate)
          contentType = sectionRules.comparison[0];
        } else if (rand < 0.65) {
          // 15% chance for visual content
          contentType = sectionRules.visual[Math.floor(Math.random() * sectionRules.visual.length)];
        } else if (rand < 0.8) {
          // 15% chance for products
          contentType = sectionRules.products[Math.floor(Math.random() * sectionRules.products.length)];
        } else if (rand < 0.9) {
          // 10% chance for social proof
          contentType = sectionRules.social[0];
        } else {
          // 10% chance for text
          contentType = sectionRules.text[0];
        }

        attempts++;
      } while (
        attempts < maxAttempts && (
          // STRICT RULE: Never allow same section type consecutively
          contentType === lastSectionType ||
          // STRICT RULE: Avoid single-column tiles stacking (especially mobile)
          (singleColumnTypes.includes(contentType) && singleColumnTypes.includes(lastSectionType)) ||
          // STRICT RULE: Don't repeat exact same section type too often
          (usedSections.has(contentType) && usedSections.size < 6)
        )
      );

      // If we couldn't find a good type, force a multi-column interactive type
      if (attempts >= maxAttempts || contentType === lastSectionType) {
        const forceTypes = sectionRules.highPriority.filter(t =>
          t !== lastSectionType &&
          !singleColumnTypes.includes(t)
        );
        if (forceTypes.length > 0) {
          contentType = forceTypes[Math.floor(Math.random() * forceTypes.length)];
        }
      }

      // Get a section of the chosen type, but ensure it's not the exact same section
      let section: ModuleSection | null = null;
      let sectionAttempts = 0;
      const maxSectionAttempts = 5;

      do {
        const candidateSection = getRandomSectionByType(contentType);
        if (candidateSection && (!lastSection || candidateSection.unique_id !== lastSection.unique_id)) {
          section = candidateSection;
          break;
        }
        sectionAttempts++;
      } while (sectionAttempts < maxSectionAttempts);

      if (section) {
        layoutSections.push(section);
        contentSectionsAdded++; // Count content sections separately from headings
        lastSectionType = contentType;
        lastSection = section;
        usedSections.add(contentType);
      } else {
        // Final fallback: use any available high-priority section
        const fallbackTypes = sectionRules.highPriority.filter(t => t !== lastSectionType);
        if (fallbackTypes.length > 0) {
          const fallbackSection = getRandomSectionByType(fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)]);
          if (fallbackSection) {
            layoutSections.push(fallbackSection);
            contentSectionsAdded++; // Count content sections separately from headings
            lastSectionType = fallbackSection.type;
            lastSection = fallbackSection;
            usedSections.add(fallbackSection.type);
          }
        }
      }

      // Extra safety: clear used sections tracking if we're running out of variety
      if (usedSections.size >= 8) {
        usedSections.clear();
      }
    }

    return layoutSections;
  };

  const getRandomSectionByType = (type: string, context: 'hero' | 'prominent' | 'secondary' | 'filler' = 'secondary'): ModuleSection | null => {
    // Use quality-aware selection - simplified for sync operation
    let sectionsOfType = modules.filter(module => module.type === type);

    if (sectionsOfType.length === 0) return null;

    // Apply basic quality filtering based on context
    if (context === 'hero' || context === 'prominent') {
      // For hero/prominent sections, prefer larger modules
      const highQualityModules = sectionsOfType.filter(module => {
        const area = (module.coordinates?.width || 0) * (module.coordinates?.height || 0);
        return area > 200000; // High resolution threshold
      });

      if (highQualityModules.length > 0) {
        sectionsOfType = highQualityModules;
      }
    }

    // Special handling for navigation
    if (type === 'navigation') {
      const goodNavModules = sectionsOfType.filter(module => {
        const width = module.coordinates?.width || 0;
        const height = module.coordinates?.height || 0;
        const aspectRatio = height > 0 ? width / height : 0;
        return aspectRatio > 3 && width > 800; // Wide navigation bars
      });

      if (goodNavModules.length > 0) {
        sectionsOfType = goodNavModules;
      }
    }

    return sectionsOfType[Math.floor(Math.random() * sectionsOfType.length)];
  };

  const calculateLayoutHeight = (sections: ModuleSection[]): number => {
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
  const isMobileMultiColumnCandidate = (section: ModuleSection): boolean => {
    // Analyze coordinates to determine if section was likely multi-column in original
    const { width, height, x, y } = section.coordinates;
    const aspectRatio = width / height;

    // Expanded criteria for brick-wall layout:
    // 1. Good aspect ratios for stacking
    // 2. Column-friendly content types
    // 3. Size suitable for subdivision

    const isGoodStackingRatio = aspectRatio >= 0.5 && aspectRatio <= 2.5; // Wider range for stacking
    const hasColumnPositioning = x > 50; // Not full-width positioned
    const isStackableFriendlyType = [
      'product_selector', 'category_carousel', 'shop_the_look',
      'testimonial', 'before_after', 'asin_waterfall', 'bestsellers',
      'linkout_image', 'static_image', 'text_block' // Added more types for variety
    ].includes(section.type);

    // Also consider sections that are large enough to be subdivided
    const isLargeEnoughToSubdivide = width > 300 && height > 200;

    return isGoodStackingRatio && (hasColumnPositioning || isStackableFriendlyType || isLargeEnoughToSubdivide);
  };

  // NEW: Create brick-wall layout groups
  const createBrickWallGroups = (sections: ModuleSection[]): Array<{ type: 'single' | 'brick', sections: ModuleSection[] }> => {
    const groups: Array<{ type: 'single' | 'brick', sections: ModuleSection[] }> = [];
    let i = 0;

    while (i < sections.length) {
      const section = sections[i];

      // Always keep headers/heroes as single
      if (['mast', 'navigation', 'hero', 'video', 'section_heading'].includes(section.type)) {
        groups.push({ type: 'single', sections: [section] });
        i++;
        continue;
      }

      // Check if this and next sections can form a brick group
      if (isMobileMultiColumnCandidate(section)) {
        const brickGroup: ModuleSection[] = [section];

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
          i = j;
        } else {
          groups.push({ type: 'single', sections: [section] });
          i++;
        }
      } else {
        groups.push({ type: 'single', sections: [section] });
        i++;
      }
    }

    return groups;
  };

  // NEW: Render brick-wall pattern
  const renderBrickGroup = (group: ModuleSection[], groupIndex: number) => {
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
  const renderSectionImage = (section: ModuleSection, isInBrick: boolean, key: string, extraStyle: React.CSSProperties = {}) => {
    return (
      <>
        <img
          src={moduleService.getImageUrl(section.cropped_files.medium)}
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

  const getSectionImageClass = (section: ModuleSection, viewMode: ViewMode, isInBrick: boolean = false): string => {
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

  const getSectionImageStyle = (section: ModuleSection, viewMode: ViewMode, isInBrick: boolean = false): React.CSSProperties => {
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
        {/* Sidebar Toggle Arrow (when collapsed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 transform -translate-y-1/2 z-30 bg-amazon-orange text-white p-2 rounded-r-lg shadow-lg hover:bg-opacity-80 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        )}

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
                          src={moduleService.getImageUrl(section.cropped_files.medium)}
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
