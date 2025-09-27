#!/usr/bin/env python3
"""
Amazon Brand Store Layout Generator - Section Processor

This script processes annotated brand store screenshots to extract, crop, and catalog
reusable sections for layout generation.

Phases:
1. Data Aggregation - Load and validate annotation files
2. Image Cropping - Extract individual sections from screenshots
3. Pattern Recognition - Group and analyze similar sections
4. Module Catalog - Generate comprehensive module database
5. React-Ready Output - Prepare organized structure for React integration
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path
from PIL import Image, ImageOps
import argparse
from typing import Dict, List, Any, Tuple, Optional
from collections import defaultdict, Counter
import hashlib

class SectionProcessor:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.screenshots_dir = self.base_dir / "store_screenshots"
        self.annotations_dir = self.base_dir / "annotations"
        self.output_dir = self.base_dir / "processed_modules"

        # Output subdirectories
        self.images_dir = self.output_dir / "images"
        self.thumbnails_dir = self.images_dir / "thumbnails"
        self.medium_dir = self.images_dir / "medium"
        self.full_dir = self.images_dir / "full"
        self.data_dir = self.output_dir / "data"
        self.stats_dir = self.output_dir / "stats"

        # Processing data
        self.annotations = []
        self.sections_catalog = []
        self.section_types = defaultdict(list)
        self.processing_stats = {
            "files_processed": 0,
            "sections_extracted": 0,
            "section_types_found": set(),
            "errors": [],
            "start_time": None,
            "end_time": None
        }

    def setup_directories(self):
        """Create output directory structure"""
        directories = [
            self.output_dir, self.images_dir, self.thumbnails_dir,
            self.medium_dir, self.full_dir, self.data_dir, self.stats_dir
        ]

        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

        print(f"Created output directory structure at: {self.output_dir}")

    def load_annotations(self) -> List[Dict]:
        """Phase 1: Load and validate all annotation files"""
        print("\n=== Phase 1: Data Aggregation ===")

        if not self.annotations_dir.exists():
            raise FileNotFoundError(f"Annotations directory not found: {self.annotations_dir}")

        annotation_files = list(self.annotations_dir.glob("annotations_*.json"))
        print(f"Found {len(annotation_files)} annotation files")

        self.processing_stats["start_time"] = datetime.now()

        for ann_file in annotation_files:
            try:
                with open(ann_file, 'r', encoding='utf-8') as f:
                    annotation = json.load(f)

                # Validate annotation structure
                if self.validate_annotation(annotation, ann_file):
                    # Find matching screenshot
                    screenshot_path = self.find_matching_screenshot(annotation["source_image"])
                    if screenshot_path:
                        annotation["screenshot_path"] = str(screenshot_path)
                        annotation["annotation_file"] = str(ann_file)
                        self.annotations.append(annotation)
                        self.processing_stats["files_processed"] += 1
                        print(f"✓ Loaded: {ann_file.name}")
                    else:
                        error_msg = f"No matching screenshot found for: {annotation['source_image']}"
                        print(f"✗ {error_msg}")
                        self.processing_stats["errors"].append(error_msg)

            except Exception as e:
                error_msg = f"Error loading {ann_file.name}: {str(e)}"
                print(f"✗ {error_msg}")
                self.processing_stats["errors"].append(error_msg)

        print(f"Successfully loaded {len(self.annotations)} annotation files")
        return self.annotations

    def validate_annotation(self, annotation: Dict, file_path: Path) -> bool:
        """Validate annotation file structure"""
        required_fields = ["source_image", "image_dimensions", "sections"]

        for field in required_fields:
            if field not in annotation:
                error_msg = f"Missing required field '{field}' in {file_path.name}"
                self.processing_stats["errors"].append(error_msg)
                return False

        # Validate sections structure
        if not isinstance(annotation["sections"], list):
            error_msg = f"'sections' must be a list in {file_path.name}"
            self.processing_stats["errors"].append(error_msg)
            return False

        for i, section in enumerate(annotation["sections"]):
            required_section_fields = ["id", "type", "coordinates"]
            for field in required_section_fields:
                if field not in section:
                    error_msg = f"Missing '{field}' in section {i} of {file_path.name}"
                    self.processing_stats["errors"].append(error_msg)
                    return False

        return True

    def find_matching_screenshot(self, source_image: str) -> Optional[Path]:
        """Find the screenshot file that matches the annotation"""
        screenshot_path = self.screenshots_dir / source_image

        if screenshot_path.exists():
            return screenshot_path

        # Try variations if exact match not found
        # Remove spaces and try again
        alt_name = source_image.replace(" ", "")
        alt_path = self.screenshots_dir / alt_name
        if alt_path.exists():
            return alt_path

        return None

    def crop_sections(self):
        """Phase 2: Extract individual sections from screenshots"""
        print("\n=== Phase 2: Image Cropping ===")

        section_counter = 1

        for annotation in self.annotations:
            try:
                screenshot_path = Path(annotation["screenshot_path"])
                print(f"Processing: {screenshot_path.name}")

                # Load the screenshot
                with Image.open(screenshot_path) as img:
                    # Convert to RGB if necessary
                    if img.mode != 'RGB':
                        img = img.convert('RGB')

                    # Process each section
                    for section in annotation["sections"]:
                        section_id = self.generate_section_id(section, section_counter)
                        coords = section["coordinates"]

                        # Crop the section
                        cropped_section = self.crop_section_image(
                            img, coords, section_id, section["type"]
                        )

                        if cropped_section:
                            # Add metadata to section
                            section["unique_id"] = section_id
                            section["source_file"] = screenshot_path.name
                            section["cropped_files"] = cropped_section
                            section["processing_date"] = datetime.now().isoformat()

                            # Add to catalog and type grouping
                            self.sections_catalog.append(section)
                            self.section_types[section["type"]].append(section)
                            self.processing_stats["sections_extracted"] += 1
                            self.processing_stats["section_types_found"].add(section["type"])

                            section_counter += 1

            except Exception as e:
                error_msg = f"Error processing {annotation.get('source_image', 'unknown')}: {str(e)}"
                print(f"✗ {error_msg}")
                self.processing_stats["errors"].append(error_msg)

        print(f"Extracted {self.processing_stats['sections_extracted']} sections")
        print(f"Found {len(self.processing_stats['section_types_found'])} unique section types")

    def generate_section_id(self, section: Dict, counter: int) -> str:
        """Generate unique ID for section"""
        section_type = section["type"].lower().replace(" ", "_")
        return f"{section_type}_{counter:04d}"

    def crop_section_image(self, img: Image.Image, coords: Dict, section_id: str, section_type: str) -> Optional[Dict]:
        """Crop section from image and save in multiple sizes"""
        try:
            # Extract coordinates
            x = coords["x"]
            y = coords["y"]
            width = coords["width"]
            height = coords["height"]

            # Ensure coordinates are within image bounds
            img_width, img_height = img.size
            x = max(0, min(x, img_width))
            y = max(0, min(y, img_height))
            width = min(width, img_width - x)
            height = min(height, img_height - y)

            if width <= 0 or height <= 0:
                print(f"Invalid crop dimensions for {section_id}: {width}x{height}")
                return None

            # Crop the section
            box = (x, y, x + width, y + height)
            cropped = img.crop(box)

            # Generate filenames
            filename_base = f"{section_id}_{section_type}"

            # Save full size
            full_path = self.full_dir / f"{filename_base}.png"
            cropped.save(full_path, "PNG", quality=95)

            # Save medium size (max 400x300, maintaining aspect ratio)
            medium_size = self.calculate_resize(cropped.size, (400, 300))
            medium = cropped.resize(medium_size, Image.Resampling.LANCZOS)
            medium_path = self.medium_dir / f"{filename_base}_medium.png"
            medium.save(medium_path, "PNG", quality=90)

            # Save thumbnail (max 200x150, maintaining aspect ratio)
            thumb_size = self.calculate_resize(cropped.size, (200, 150))
            thumbnail = cropped.resize(thumb_size, Image.Resampling.LANCZOS)
            thumb_path = self.thumbnails_dir / f"{filename_base}_thumb.png"
            thumbnail.save(thumb_path, "PNG", quality=80)

            return {
                "full": str(full_path.relative_to(self.output_dir)),
                "medium": str(medium_path.relative_to(self.output_dir)),
                "thumbnail": str(thumb_path.relative_to(self.output_dir)),
                "dimensions": {
                    "original": {"width": width, "height": height},
                    "medium": {"width": medium_size[0], "height": medium_size[1]},
                    "thumbnail": {"width": thumb_size[0], "height": thumb_size[1]}
                }
            }

        except Exception as e:
            print(f"Error cropping section {section_id}: {str(e)}")
            return None

    def calculate_resize(self, original_size: Tuple[int, int], max_size: Tuple[int, int]) -> Tuple[int, int]:
        """Calculate new size maintaining aspect ratio"""
        width, height = original_size
        max_width, max_height = max_size

        # Calculate scaling factor
        scale = min(max_width / width, max_height / height, 1.0)

        new_width = int(width * scale)
        new_height = int(height * scale)

        return (new_width, new_height)

    def analyze_patterns(self):
        """Phase 3: Pattern Recognition & Grouping"""
        print("\n=== Phase 3: Pattern Recognition & Grouping ===")

        patterns = {
            "section_types": {},
            "common_dimensions": {},
            "aspect_ratios": {},
            "frequency_analysis": {}
        }

        # Analyze each section type
        for section_type, sections in self.section_types.items():
            print(f"Analyzing {section_type}: {len(sections)} sections")

            # Collect dimensions and aspect ratios
            dimensions = []
            aspect_ratios = []
            areas = []

            for section in sections:
                coords = section["coordinates"]
                width = coords["width"]
                height = coords["height"]
                area = width * height
                aspect_ratio = round(width / height, 2) if height > 0 else 0

                dimensions.append((width, height))
                aspect_ratios.append(aspect_ratio)
                areas.append(area)

            # Find common patterns
            dimension_counter = Counter(dimensions)
            aspect_counter = Counter(aspect_ratios)

            patterns["section_types"][section_type] = {
                "count": len(sections),
                "common_dimensions": dimension_counter.most_common(5),
                "common_aspect_ratios": aspect_counter.most_common(3),
                "avg_area": sum(areas) / len(areas) if areas else 0,
                "size_range": {
                    "min_area": min(areas) if areas else 0,
                    "max_area": max(areas) if areas else 0
                }
            }

        # Overall frequency analysis
        patterns["frequency_analysis"] = {
            "most_common_types": Counter([s["type"] for s in self.sections_catalog]).most_common(10),
            "total_sections": len(self.sections_catalog),
            "unique_types": len(self.section_types)
        }

        # Save patterns
        patterns_file = self.data_dir / "patterns.json"
        with open(patterns_file, 'w', encoding='utf-8') as f:
            json.dump(patterns, f, indent=2, ensure_ascii=False)

        print(f"Pattern analysis saved to: {patterns_file}")
        return patterns

    def generate_module_catalog(self):
        """Phase 4: Module Catalog Generation"""
        print("\n=== Phase 4: Module Catalog Generation ===")

        catalog = {
            "metadata": {
                "generated": datetime.now().isoformat(),
                "total_modules": len(self.sections_catalog),
                "source_stores": len(self.annotations),
                "section_types": list(self.processing_stats["section_types_found"])
            },
            "modules": self.sections_catalog,
            "types_index": {
                section_type: [s["unique_id"] for s in sections]
                for section_type, sections in self.section_types.items()
            }
        }

        # Save main catalog
        catalog_file = self.data_dir / "modules_catalog.json"
        with open(catalog_file, 'w', encoding='utf-8') as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)

        print(f"Module catalog saved to: {catalog_file}")
        return catalog

    def generate_react_templates(self):
        """Phase 5: React-Ready Output"""
        print("\n=== Phase 5: React-Ready Output ===")

        # Generate layout templates based on common patterns
        templates = {
            "basic_layouts": [
                {
                    "name": "Hero + Products",
                    "description": "Simple layout with hero section followed by product grid",
                    "sections": ["hero", "products"],
                    "use_cases": ["Product launches", "Brand showcases"]
                },
                {
                    "name": "Full Brand Experience",
                    "description": "Comprehensive layout with all major section types",
                    "sections": ["mast", "navigation", "hero", "products", "testimonial", "video"],
                    "use_cases": ["Complete brand stores", "Campaign pages"]
                }
            ],
            "component_hierarchy": {
                "header_sections": ["mast", "navigation"],
                "hero_sections": ["hero", "video"],
                "content_sections": ["products", "gallery", "text_block", "testimonial"],
                "interactive_sections": ["product_selector", "reels", "category_carousel"],
                "footer_sections": ["footer", "linkout_image"]
            },
            "responsive_guidelines": {
                "mobile_adaptations": {
                    "stack_sections": True,
                    "reduce_padding": True,
                    "single_column": True
                },
                "tablet_adaptations": {
                    "two_column_max": True,
                    "medium_padding": True
                }
            }
        }

        # Save templates
        templates_file = self.data_dir / "templates.json"
        with open(templates_file, 'w', encoding='utf-8') as f:
            json.dump(templates, f, indent=2, ensure_ascii=False)

        print(f"React templates saved to: {templates_file}")
        return templates

    def generate_statistics(self):
        """Generate processing statistics and recommendations"""
        self.processing_stats["end_time"] = datetime.now()
        processing_time = (self.processing_stats["end_time"] - self.processing_stats["start_time"]).total_seconds()

        stats = {
            "processing_summary": {
                "files_processed": self.processing_stats["files_processed"],
                "sections_extracted": self.processing_stats["sections_extracted"],
                "processing_time_seconds": processing_time,
                "errors_count": len(self.processing_stats["errors"])
            },
            "section_type_breakdown": {
                section_type: len(sections)
                for section_type, sections in self.section_types.items()
            },
            "recommendations": self.generate_recommendations(),
            "errors": self.processing_stats["errors"]
        }

        # Save statistics
        stats_file = self.stats_dir / "analysis.json"
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)

        print(f"Statistics saved to: {stats_file}")
        return stats

    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []

        # Check for common section types
        type_counts = Counter([s["type"] for s in self.sections_catalog])
        most_common = type_counts.most_common(3)

        if most_common:
            recommendations.append(
                f"Most used section types: {', '.join([f'{t}({c})' for t, c in most_common])}. "
                "Consider creating multiple variants of these."
            )

        # Check for underused types
        rare_types = [t for t, count in type_counts.items() if count == 1]
        if rare_types:
            recommendations.append(
                f"Rare section types found: {', '.join(rare_types)}. "
                "Consider if these are special cases or could be generalized."
            )

        # Size recommendations
        if len(self.sections_catalog) > 50:
            recommendations.append(
                "Large catalog detected. Consider implementing search and filtering in React UI."
            )

        return recommendations

    def run_full_processing(self):
        """Run complete processing pipeline"""
        print("Amazon Brand Store Section Processor")
        print("=" * 50)

        try:
            # Setup
            self.setup_directories()

            # Phase 1: Load annotations
            self.load_annotations()

            if not self.annotations:
                print("No valid annotations found. Exiting.")
                return

            # Phase 2: Crop sections
            self.crop_sections()

            # Phase 3: Analyze patterns
            self.analyze_patterns()

            # Phase 4: Generate catalog
            self.generate_module_catalog()

            # Phase 5: Generate React templates
            self.generate_react_templates()

            # Generate statistics
            stats = self.generate_statistics()

            # Final summary
            print("\n" + "=" * 50)
            print("PROCESSING COMPLETE")
            print("=" * 50)
            print(f"Files processed: {stats['processing_summary']['files_processed']}")
            print(f"Sections extracted: {stats['processing_summary']['sections_extracted']}")
            print(f"Section types found: {len(self.section_types)}")
            print(f"Processing time: {stats['processing_summary']['processing_time_seconds']:.2f} seconds")

            if stats['processing_summary']['errors_count'] > 0:
                print(f"Errors encountered: {stats['processing_summary']['errors_count']}")
                print("Check analysis.json for details")

            print(f"\nOutput directory: {self.output_dir}")
            print("Ready for React Layout Generator development!")

        except Exception as e:
            print(f"Critical error: {str(e)}")
            raise

def main():
    parser = argparse.ArgumentParser(description="Amazon Brand Store Section Processor")
    parser.add_argument("--base-dir", default=".", help="Base directory containing screenshots and annotations")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    args = parser.parse_args()

    processor = SectionProcessor(args.base_dir)
    processor.run_full_processing()

if __name__ == "__main__":
    main()