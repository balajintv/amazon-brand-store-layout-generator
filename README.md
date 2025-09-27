# Amazon Brand Store Layout Generator - Section Processor

## Overview
The Section Processor is the first phase of the Amazon Brand Store Layout Generator project. It processes annotated brand store screenshots to extract, crop, and catalog reusable sections for layout generation.

## Features

### ✅ Completed - Section Processor
- **Data Aggregation**: Loads and validates 15 annotation files with 473 total sections
- **Image Cropping**: Extracts individual sections in 3 sizes (full, medium, thumbnail)
- **Pattern Recognition**: Analyzes 17 unique section types and their usage patterns
- **Module Catalog**: Generates comprehensive JSON database of all sections
- **React-Ready Output**: Prepares organized structure for React integration

## Results Summary

### Processing Statistics
- **Files Processed**: 15 annotation files
- **Sections Extracted**: 473 individual sections
- **Section Types**: 17 unique types discovered
- **Processing Time**: ~54 seconds
- **Errors**: 0 (100% success rate)

### Section Types Discovered
| Type | Count | Usage |
|------|-------|-------|
| section_heading | 104 | Most common - titles and headers |
| linkout_image | 96 | Second most - promotional images |
| static_image | 65 | Third most - decorative content |
| testimonial | 47 | Customer reviews and quotes |
| shop_the_look | 35 | Product styling sections |
| category_carousel | 18 | Product category navigation |
| text_block | 17 | Content blocks |
| mast | 15 | Header/banner sections |
| navigation | 15 | Navigation menus |
| reels | 15 | Video content carousels |
| video | 14 | Standalone video sections |
| asin_waterfall | 12 | Product listings |
| product_selector | 6 | Interactive product choosers |
| hero | 5 | Large hero sections |
| bestsellers | 5 | Featured product sections |
| before_after | 3 | Comparison sections |
| product_grid | 1 | Product grid layout |

## Generated Output Structure

```
processed_modules/
├── images/
│   ├── thumbnails/    # 200x150 max - UI previews
│   ├── medium/        # 400x300 max - display size
│   └── full/          # Original crop size
├── data/
│   ├── modules_catalog.json    # Complete module database (18,510 lines)
│   ├── patterns.json           # Pattern analysis (1,004 lines)
│   └── templates.json          # Layout templates (67 lines)
└── stats/
    └── analysis.json           # Processing statistics
```

## Key Insights

### Most Used Section Types
1. **section_heading (104)** - Headers and titles appear in almost every section
2. **linkout_image (96)** - Promotional and call-to-action images are very common
3. **static_image (65)** - Decorative and brand images provide visual appeal

### Recommendations Generated
- Focus on creating multiple variants of the top 3 section types
- Consider generalizing rare types like `product_grid` (only 1 instance)
- Implement search and filtering in React UI due to large catalog size (473+ modules)

## Usage

### Prerequisites
```bash
pip install -r requirements.txt
```

### Running the Processor
```bash
python3 section_processor.py --verbose
```

### Command Line Options
- `--base-dir`: Specify base directory (default: current directory)
- `--verbose`: Enable detailed output
- `--help`: Show all options

## File Structure Required

```
project_directory/
├── store_screenshots/     # PNG screenshots
├── annotations/          # JSON annotation files
└── section_processor.py  # This script
```

### Naming Convention
- Screenshot: `Screenshot YYYY-MM-DD at HH-MM-SS Amazon.in Brand Name.png`
- Annotation: `annotations_Screenshot YYYY-MM-DD at HH-MM-SS Amazon.in Brand Name.json`

## Next Steps

### Phase 2: React Layout Generator
With the Section Processor complete, the next phase involves building a React-based layout generator that will:

1. **Visual Module Library** - Browse extracted sections by type and style
2. **Drag & Drop Interface** - Build layouts by combining sections
3. **Real-time Preview** - See layouts as you construct them
4. **Responsive Design** - Test desktop and mobile views
5. **Export Functionality** - Generate HTML/CSS or React components

### Ready for Development
The processed modules are now ready for React integration with:
- 473 pre-cropped section images in 3 sizes
- Comprehensive JSON catalog with metadata
- Pattern analysis for smart recommendations
- Template structures for common layouts

## Technical Details

### Image Processing
- Maintains aspect ratios during resize
- Generates multiple formats for different use cases
- Handles various screenshot dimensions automatically
- Quality optimization for web usage

### Data Structure
- Unique IDs for all sections across stores
- Cross-referenced by type for easy filtering
- Metadata includes source store and dimensions
- JSON structure optimized for React consumption

## Error Handling
- Validates all annotation files before processing
- Checks for matching screenshots
- Handles missing or corrupted files gracefully
- Provides detailed error reporting

---

**Status**: ✅ Section Processor Complete - Ready for React Layout Generator