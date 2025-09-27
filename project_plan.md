# Amazon Brand Store Layout Generator - Project Plan

## Project Overview
Build a layout generator for Amazon brand stores using extracted modules from screenshots. The system extracts reusable sections from existing brand stores and creates a React-based tool to generate new layouts using UX principles.

## Current Status
- ✅ **HTML Annotation Tool**: Completed and working
- ✅ **Screenshots Collected**: 46 brand store screenshots (10MB+ each)
- ✅ **Annotations Complete**: 15 screenshots annotated so far
- 🔄 **Next Phase**: Section Processor development
- ⏳ **Final Phase**: React Layout Generator

## File Structure & Naming Convention

```
project_folder/
├── screenshots/
│   ├── Screenshot 2025-09-26 at 07-45-23 Amazon.in India Circus by Krsnaa Mehta.png
│   ├── Screenshot 2025-09-26 at 08-15-42 Amazon.in Two Brothers Organic Farms.png
│   └── [other screenshot files...]
├── annotations/
│   ├── annotations_Screenshot 2025-09-26 at 07-45-23 Amazon.in India Circus by Krsnaa Mehta.json
│   ├── annotations_Screenshot 2025-09-26 at 08-15-42 Amazon.in Two Brothers Organic Farms.json
│   └── [other annotation files...]
└── processed_modules/    # Output folder (to be created)
```

### Naming Pattern
- **Screenshot**: `[original filename].png`  
- **Annotation**: `annotations_[original filename].json`

### Matching Logic for Code
```python
# For any screenshot file:
screenshot_file = "Screenshot 2025-09-26 at 07-45-23 Amazon.in India Circus by Krsnaa Mehta.png"

# Remove extension and add annotations prefix:
base_name = screenshot_file.replace('.png', '')
annotation_file = f"annotations_{base_name}.json"
```

## Section Types Available

### Standard E-commerce Sections
- Hero, Products, Gallery, Video, Text, Navigation, Reviews, Footer, Featured, Compare

### Amazon-Specific Sections  
- Heading, Selector, Shop Look, Reels, Bestsellers, Before/After, Calculator, ASIN Fall, Category

### Additional Types
- Mast, Static Image, Link-out Image

### Custom Types
- User can add any custom section types during annotation

## Section Processor Requirements

### Phase 1: Data Aggregation
- **Load all annotation JSON files** from annotations/ directory
- **Combine into master catalog** - merge all sections from all stores
- **Validate data** - check for missing coordinates, malformed entries
- **Generate unique IDs** for each section across all stores

### Phase 2: Image Cropping
- **Load original screenshots** from screenshots/ directory
- **Match with annotations** using naming convention
- **Crop individual sections** using coordinates from JSON
- **Save as separate images** (hero_001.png, product_grid_002.png, etc.)
- **Maintain aspect ratios** and quality
- **Handle different screenshot sizes/scales**

### Phase 3: Pattern Recognition & Grouping
- **Group similar sections** by type (all heroes together, all product grids, etc.)
- **Analyze dimensions** - find common sizes within each type
- **Detect visual patterns** - similar layouts, color schemes
- **Calculate frequency** - which section types appear most often
- **Identify variants** - different styles within same section type

### Phase 4: Module Catalog Generation
- **Create comprehensive JSON** with all processed modules
- **Add metadata** - dimensions, source store, crop coordinates
- **Generate thumbnails** - small preview images for React UI
- **Create component templates** - HTML/CSS structure hints
- **Build search/filter data** - tags, categories, dimensions

### Phase 5: React-Ready Output
- **Organized file structure** for easy React import
- **Responsive sizing data** - how sections should scale
- **Layout relationships** - which sections work well together
- **Component hierarchy** - suggested ordering and groupings

## Expected Output Structure

```
processed_modules/
├── images/
│   ├── thumbnails/     # Small previews (200x150)
│   ├── medium/         # UI display size (400x300)
│   └── full/           # Original crop size
├── data/
│   ├── modules_catalog.json    # Complete module database
│   ├── patterns.json           # Identified patterns
│   └── templates.json          # Layout templates
└── stats/
    ├── analysis.json           # Processing statistics
    └── recommendations.json    # Suggested combinations
```

## Processing Requirements

1. **Scan screenshots folder** for .png files
2. **Find matching annotation** by adding "annotations_" prefix and changing extension
3. **Skip if no matching annotation** exists
4. **Process paired files** together (image + coordinates)
5. **Generate cropped sections** with proper naming
6. **Create module catalog** with all metadata

## Annotation JSON Structure

Each annotation file contains:
```json
{
  "source_image": "Screenshot 2025-09-26 at 07-45-23 Amazon.in India Circus by Krsnaa Mehta.png",
  "image_dimensions": {
    "width": 1920,
    "height": 8000
  },
  "total_sections": 5,
  "sections": [
    {
      "id": "hero_001",
      "type": "hero",
      "name": "hero Section 1",
      "coordinates": {
        "x": 0,
        "y": 0,
        "width": 1920,
        "height": 500
      },
      "area": 960000,
      "center": {
        "x": 960,
        "y": 250
      }
    }
  ],
  "annotation_metadata": {
    "created": "2025-01-15T10:30:00Z",
    "annotated_by": "manual"
  }
}
```

## Key Technical Considerations

### Image Processing
- Handle different screenshot resolutions
- Maintain quality during cropping
- Generate multiple sizes (thumbnail, medium, full)
- Optimize file formats (WebP for web, PNG for quality)

### Data Structure
- Consistent naming convention across all modules
- Hierarchical organization (type > variant > instance)
- Cross-references between related sections
- Version tracking for updates

### Pattern Analysis
- Detect duplicate/similar sections across stores
- Identify layout templates and variations
- Calculate optimal sizing for different screen sizes
- Group complementary section combinations

## React Layout Generator Requirements

### Core Features
- **Visual module library** - thumbnail grid of all available sections
- **Drag & drop interface** - build layouts by dragging sections
- **Real-time preview** - see layout as you build it
- **Responsive preview** - test desktop/mobile views
- **Export functionality** - generate HTML/CSS or React components

### UX Principles Integration
- **Visual hierarchy enforcement** - hero sections at top
- **Logical content flow** - proper section ordering
- **Responsive design rules** - mobile-first approach
- **Brand consistency** - color and spacing guidelines

### Layout Templates
- Pre-built templates based on common patterns from analysis
- Template variations for different industries/products
- Smart suggestions based on selected modules

## Development Approach

### For Section Processor
- Use Python with PIL/Pillow for image processing
- JSON processing for annotation data
- Organized file output structure
- Progress tracking and error handling

### For React Generator
- Modern React with hooks
- Tailwind CSS for styling
- Drag & drop library (react-beautiful-dnd or similar)
- Image optimization and lazy loading
- Export functionality for final layouts

## Success Metrics

- Successfully process all annotation files
- Generate clean, organized module library
- Create React tool that builds professional layouts
- Export capability produces usable HTML/CSS or React code
- Layout generator follows UX best practices

## Next Steps

1. **Build Section Processor** - Process 15 completed annotations
2. **Test & Validate** - Ensure output quality and completeness
3. **Complete remaining annotations** - Process all 46 screenshots
4. **Build React Layout Generator** - Visual interface for layout creation
5. **Add export functionality** - Generate final HTML/CSS or React components

## Notes

- Only desktop screenshots collected (mobile layouts auto-generated through responsive CSS)
- Tool designed for localhost development initially
- Can be deployed later to static hosting (Vercel, Netlify, etc.)
- Focus on reusable, modular components for maximum flexibility
