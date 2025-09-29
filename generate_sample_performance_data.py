#!/usr/bin/env python3
"""
Sample Performance Data Generator
Creates realistic performance metrics for testing the analysis system
"""

import pandas as pd
import numpy as np
import json
from pathlib import Path
import random
from datetime import datetime, timedelta

class SamplePerformanceGenerator:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.annotations_dir = self.base_dir / "annotations"

        # Performance ranges based on industry benchmarks
        self.performance_ranges = {
            'dwell_time': (90, 250),  # seconds
            'bounce_rate': (25, 60),  # percentage
            'sales_per_visit': (15, 120),  # INR
            'units_per_visit': (0.8, 3.5),  # units
            'conversion_rate': (3, 15),  # percentage
            'scroll_depth': (45, 85),  # percentage
            'ctr': (8, 25)  # percentage
        }

        # Brand performance tiers (some brands perform better)
        self.brand_tiers = {
            'premium': {'multiplier': 1.3, 'probability': 0.2},
            'good': {'multiplier': 1.1, 'probability': 0.4},
            'average': {'multiplier': 1.0, 'probability': 0.3},
            'below_average': {'multiplier': 0.8, 'probability': 0.1}
        }

    def get_screenshot_files(self):
        """Get all screenshot files from annotations"""
        annotation_files = list(self.annotations_dir.glob("*.json"))
        screenshot_files = []

        for ann_file in annotation_files:
            try:
                with open(ann_file, 'r') as f:
                    data = json.load(f)
                    screenshot_files.append(data.get('source_image', ''))
            except:
                continue

        return [f for f in screenshot_files if f]

    def assign_brand_tier(self):
        """Assign performance tier to brand"""
        rand = random.random()
        cumulative = 0

        for tier, data in self.brand_tiers.items():
            cumulative += data['probability']
            if rand <= cumulative:
                return tier, data['multiplier']

        return 'average', 1.0

    def generate_correlated_metrics(self, tier_multiplier: float):
        """Generate realistic, correlated performance metrics"""
        # Base metrics with realistic correlations
        base_engagement = random.uniform(0.4, 0.9)  # Engagement factor

        # Dwell time (higher engagement = longer dwell time)
        dwell_base = self.performance_ranges['dwell_time']
        dwell_time = random.uniform(dwell_base[0], dwell_base[1]) * (0.7 + 0.6 * base_engagement) * tier_multiplier

        # Bounce rate (inverse correlation with engagement)
        bounce_base = self.performance_ranges['bounce_rate']
        bounce_rate = random.uniform(bounce_base[0], bounce_base[1]) * (1.4 - 0.7 * base_engagement) / tier_multiplier

        # Conversion rate (correlated with engagement and dwell time)
        conv_base = self.performance_ranges['conversion_rate']
        conversion_rate = random.uniform(conv_base[0], conv_base[1]) * base_engagement * tier_multiplier

        # Sales per visit (correlated with conversion rate)
        sales_base = self.performance_ranges['sales_per_visit']
        sales_per_visit = random.uniform(sales_base[0], sales_base[1]) * (0.5 + 1.0 * conversion_rate / 15) * tier_multiplier

        # Units per visit (correlated with conversion)
        units_base = self.performance_ranges['units_per_visit']
        units_per_visit = random.uniform(units_base[0], units_base[1]) * (0.6 + 0.8 * conversion_rate / 15) * tier_multiplier

        # Scroll depth (correlated with dwell time)
        scroll_base = self.performance_ranges['scroll_depth']
        scroll_depth = random.uniform(scroll_base[0], scroll_base[1]) * (0.7 + 0.6 * dwell_time / 200)

        # Click-through rate (correlated with engagement)
        ctr_base = self.performance_ranges['ctr']
        ctr = random.uniform(ctr_base[0], ctr_base[1]) * base_engagement * tier_multiplier

        # Traffic data
        base_visitors = random.randint(15000, 80000)
        unique_visitors = int(base_visitors * random.uniform(0.65, 0.85))

        # Traffic source distribution
        organic_pct = random.uniform(0.35, 0.65)
        paid_pct = random.uniform(0.20, 0.45)
        direct_pct = max(0.05, 1.0 - organic_pct - paid_pct)

        # Normalize traffic sources
        total_traffic = organic_pct + paid_pct + direct_pct
        organic_pct /= total_traffic
        paid_pct /= total_traffic
        direct_pct /= total_traffic

        return {
            'avg_dwell_time_seconds': round(dwell_time, 1),
            'median_dwell_time_seconds': round(dwell_time * 0.85, 1),
            'bounce_rate_percentage': round(bounce_rate, 1),
            'sales_per_visit_inr': round(sales_per_visit, 2),
            'units_per_visit': round(units_per_visit, 2),
            'conversion_rate_percentage': round(conversion_rate, 1),
            'avg_scroll_depth_percentage': round(scroll_depth, 1),
            'click_through_rate_percentage': round(ctr, 1),
            'total_visitors': base_visitors,
            'unique_visitors': unique_visitors,
            'traffic_source_organic_percentage': round(organic_pct * 100, 1),
            'traffic_source_paid_percentage': round(paid_pct * 100, 1),
            'traffic_source_direct_percentage': round(direct_pct * 100, 1)
        }

    def extract_brand_name(self, screenshot_filename: str) -> str:
        """Extract brand name from screenshot filename"""
        # Remove common prefixes and extensions
        name = screenshot_filename.replace('Screenshot ', '')
        name = name.replace('.png', '')

        # Extract brand name after "Amazon.in"
        if 'Amazon.in' in name:
            parts = name.split('Amazon.in')
            if len(parts) > 1:
                brand = parts[1].strip()
                # Clean up brand name
                brand = brand.replace(' - ', ' ')
                return brand[:50]  # Limit length

        return name[:50]

    def generate_performance_data(self):
        """Generate complete performance dataset"""
        screenshot_files = self.get_screenshot_files()

        if not screenshot_files:
            print("❌ No screenshot files found in annotations")
            return None

        performance_data = []
        collection_start = datetime.now() - timedelta(days=45)
        collection_end = datetime.now() - timedelta(days=15)

        for i, screenshot_file in enumerate(screenshot_files):
            # Assign brand tier for performance variation
            tier, tier_multiplier = self.assign_brand_tier()

            # Generate correlated metrics
            metrics = self.generate_correlated_metrics(tier_multiplier)

            # Extract brand name
            brand_name = self.extract_brand_name(screenshot_file)

            # Compile data row
            row = {
                'store_id': f'store_{i+1:03d}',
                'brand_name': brand_name,
                'screenshot_filename': screenshot_file,
                'collection_start_date': collection_start.strftime('%Y-%m-%d'),
                'collection_end_date': collection_end.strftime('%Y-%m-%d'),
                **metrics,
                'brand_tier': tier,  # For reference, not in final CSV
                'tier_multiplier': tier_multiplier  # For reference
            }

            performance_data.append(row)

        return performance_data

    def save_performance_data(self, data: list):
        """Save performance data to CSV"""
        if not data:
            return False

        # Remove internal fields
        clean_data = []
        for row in data:
            clean_row = {k: v for k, v in row.items()
                        if k not in ['brand_tier', 'tier_multiplier']}
            clean_data.append(clean_row)

        df = pd.DataFrame(clean_data)

        # Save to CSV
        output_file = self.base_dir / "performance_data.csv"
        df.to_csv(output_file, index=False)

        print(f"💾 Saved performance data: {output_file}")
        print(f"📊 Generated data for {len(df)} stores")

        # Print summary statistics
        print("\n📈 Performance Data Summary:")
        print(f"   Avg Dwell Time: {df['avg_dwell_time_seconds'].mean():.1f}s")
        print(f"   Avg Bounce Rate: {df['bounce_rate_percentage'].mean():.1f}%")
        print(f"   Avg Conversion Rate: {df['conversion_rate_percentage'].mean():.1f}%")
        print(f"   Avg Sales/Visit: ₹{df['sales_per_visit_inr'].mean():.2f}")

        # Show tier distribution
        tier_counts = pd.Series([d['brand_tier'] for d in data]).value_counts()
        print(f"\n🏆 Brand Tier Distribution:")
        for tier, count in tier_counts.items():
            print(f"   {tier.title()}: {count} brands")

        return True

    def generate_sample_dataset(self):
        """Generate complete sample performance dataset"""
        print("🎲 Generating sample performance data...")

        data = self.generate_performance_data()
        if data:
            return self.save_performance_data(data)
        else:
            print("❌ Failed to generate performance data")
            return False

def main():
    generator = SamplePerformanceGenerator()

    if generator.generate_sample_dataset():
        print("\n✅ Sample performance data generated successfully!")
        print("\nNext steps:")
        print("1. Review performance_data.csv")
        print("2. Run: python3 performance_analyzer.py")
        print("3. Check processed_modules/analytics/ for results")
    else:
        print("\n❌ Failed to generate sample data")

if __name__ == "__main__":
    main()