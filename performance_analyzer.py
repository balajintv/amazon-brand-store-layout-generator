#!/usr/bin/env python3
"""
Performance-Driven Section Analyzer
Calculates section part-worth based on performance metrics and spatial analysis
"""

import pandas as pd
import numpy as np
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestRegressor
import json
from pathlib import Path
from typing import Dict, List, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

class PerformanceAnalyzer:
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.performance_data_file = self.base_dir / "performance_data.csv"
        self.modules_catalog_file = self.base_dir / "processed_modules" / "data" / "modules_catalog.json"
        self.output_dir = self.base_dir / "processed_modules" / "analytics"
        self.output_dir.mkdir(exist_ok=True)

        # Analytics data
        self.performance_df = None
        self.modules_data = None
        self.enriched_sections = []
        self.part_worth_analysis = {}

    def load_performance_data(self):
        """Load performance metrics from CSV"""
        try:
            self.performance_df = pd.read_csv(self.performance_data_file)
            print(f"📊 Loaded performance data for {len(self.performance_df)} stores")
            return True
        except FileNotFoundError:
            print(f"❌ Performance data file not found: {self.performance_data_file}")
            print("   Create performance_data.csv with your metrics first")
            return False

    def load_modules_catalog(self):
        """Load existing modules catalog"""
        try:
            with open(self.modules_catalog_file, 'r') as f:
                self.modules_data = json.load(f)
            print(f"📦 Loaded {len(self.modules_data['modules'])} modules from catalog")
            return True
        except FileNotFoundError:
            print(f"❌ Modules catalog not found: {self.modules_catalog_file}")
            print("   Run section_processor.py first")
            return False

    def enrich_sections_with_performance(self):
        """Attach performance metrics to each section"""
        enriched_sections = []

        for module in self.modules_data['modules']:
            # Find matching performance data by screenshot filename
            screenshot_filename = module['source_image']
            perf_row = self.performance_df[
                self.performance_df['screenshot_filename'] == screenshot_filename
            ]

            if len(perf_row) > 0:
                perf_data = perf_row.iloc[0].to_dict()

                # Calculate section-specific metrics based on position and type
                section_metrics = self._calculate_section_performance(module, perf_data)

                # Enrich module with performance data
                enriched_module = {
                    **module,
                    'performance_metrics': {
                        'store_level': perf_data,
                        'section_level': section_metrics
                    }
                }
                enriched_sections.append(enriched_module)
            else:
                # No performance data available
                enriched_module = {
                    **module,
                    'performance_metrics': {
                        'store_level': None,
                        'section_level': None
                    }
                }
                enriched_sections.append(enriched_module)

        self.enriched_sections = enriched_sections
        print(f"✅ Enriched {len(enriched_sections)} sections with performance data")

    def _calculate_section_performance(self, module: Dict, store_perf: Dict) -> Dict:
        """Calculate section-level performance based on position and type"""
        coords = module['coordinates']
        section_type = module['type']

        # Position-based multipliers
        position_factors = self._calculate_position_factors(coords, store_perf)

        # Type-based performance characteristics
        type_factors = self._get_type_performance_factors(section_type)

        # Calculate estimated section metrics
        section_metrics = {
            'estimated_view_time': self._estimate_view_time(coords, store_perf, position_factors),
            'estimated_engagement_score': self._estimate_engagement(section_type, position_factors, type_factors),
            'estimated_conversion_contribution': self._estimate_conversion_contribution(
                section_type, position_factors, store_perf
            ),
            'position_factors': position_factors,
            'type_factors': type_factors
        }

        return section_metrics

    def _calculate_position_factors(self, coords: Dict, store_perf: Dict) -> Dict:
        """Calculate performance factors based on section position"""
        y_position = coords['y']
        height = coords['height']
        width = coords['width']

        # Above-the-fold bonus (higher performance for top sections)
        above_fold_factor = max(0.5, 1.2 - (y_position / 800))  # Assume 800px fold

        # Width impact (full-width sections often perform better)
        width_factor = min(1.2, width / 1920)  # Normalize to typical screen width

        # Height impact (optimal height sections perform better)
        height_factor = self._optimal_height_factor(height, coords['y'])

        # Scroll depth impact
        scroll_depth = store_perf.get('avg_scroll_depth_percentage', 70) / 100
        visibility_factor = min(1.0, (y_position + height) / (scroll_depth * 5000))  # Assume 5000px page

        return {
            'above_fold_factor': above_fold_factor,
            'width_factor': width_factor,
            'height_factor': height_factor,
            'visibility_factor': visibility_factor,
            'composite_position_score': (above_fold_factor * width_factor * height_factor * visibility_factor)
        }

    def _optimal_height_factor(self, height: int, y_pos: int) -> float:
        """Calculate optimal height factor based on section type and position"""
        if y_pos < 800:  # Above fold
            optimal_heights = {200: 1.0, 400: 1.2, 600: 1.1, 800: 0.9}
        else:  # Below fold
            optimal_heights = {150: 0.8, 300: 1.0, 450: 1.1, 600: 0.9}

        # Find closest optimal height
        closest_optimal = min(optimal_heights.keys(), key=lambda x: abs(x - height))
        return optimal_heights[closest_optimal]

    def _get_type_performance_factors(self, section_type: str) -> Dict:
        """Get performance characteristics by section type"""
        type_characteristics = {
            'hero': {'engagement': 1.2, 'conversion': 1.1, 'dwell_time': 1.3},
            'product_selector': {'engagement': 1.4, 'conversion': 1.5, 'dwell_time': 1.1},
            'bestsellers': {'engagement': 1.3, 'conversion': 1.4, 'dwell_time': 1.0},
            'shop_the_look': {'engagement': 1.2, 'conversion': 1.3, 'dwell_time': 1.2},
            'category_carousel': {'engagement': 1.1, 'conversion': 1.2, 'dwell_time': 0.9},
            'testimonial': {'engagement': 1.0, 'conversion': 1.1, 'dwell_time': 1.1},
            'before_after': {'engagement': 1.3, 'conversion': 1.2, 'dwell_time': 1.4},
            'video': {'engagement': 1.4, 'conversion': 1.0, 'dwell_time': 1.5},
            'static_image': {'engagement': 0.8, 'conversion': 0.7, 'dwell_time': 0.8},
            'text_block': {'engagement': 0.7, 'conversion': 0.6, 'dwell_time': 1.0},
            'section_heading': {'engagement': 0.6, 'conversion': 0.5, 'dwell_time': 0.5}
        }

        return type_characteristics.get(section_type, {'engagement': 1.0, 'conversion': 1.0, 'dwell_time': 1.0})

    def _estimate_view_time(self, coords: Dict, store_perf: Dict, position_factors: Dict) -> float:
        """Estimate section view time"""
        base_dwell = store_perf.get('avg_dwell_time_seconds', 120)
        section_area = coords['width'] * coords['height']
        total_area = 1920 * 5000  # Assume typical page size

        area_proportion = section_area / total_area
        estimated_view_time = (base_dwell * area_proportion *
                             position_factors['composite_position_score'])

        return max(0.5, estimated_view_time)  # Minimum 0.5 seconds

    def _estimate_engagement(self, section_type: str, position_factors: Dict, type_factors: Dict) -> float:
        """Estimate section engagement score"""
        base_engagement = 0.5  # Base engagement score

        engagement_score = (base_engagement *
                          position_factors['composite_position_score'] *
                          type_factors['engagement'])

        return min(1.0, max(0.1, engagement_score))  # Clamp between 0.1 and 1.0

    def _estimate_conversion_contribution(self, section_type: str, position_factors: Dict, store_perf: Dict) -> float:
        """Estimate section's contribution to conversion"""
        store_conversion = store_perf.get('conversion_rate_percentage', 5) / 100
        type_factors = self._get_type_performance_factors(section_type)

        section_conversion_contribution = (store_conversion *
                                         position_factors['composite_position_score'] *
                                         type_factors['conversion'] * 0.1)  # Scale down

        return max(0.001, section_conversion_contribution)

    def calculate_part_worth_analysis(self):
        """Calculate statistical part-worth of sections"""
        print("🧮 Calculating part-worth analysis...")

        # Prepare data for analysis
        analysis_data = []
        for section in self.enriched_sections:
            if section['performance_metrics']['section_level']:
                metrics = section['performance_metrics']
                store_metrics = metrics['store_level']
                section_metrics = metrics['section_level']

                analysis_data.append({
                    'section_id': section['unique_id'],
                    'type': section['type'],
                    'x': section['coordinates']['x'],
                    'y': section['coordinates']['y'],
                    'width': section['coordinates']['width'],
                    'height': section['coordinates']['height'],
                    'area': section['coordinates']['width'] * section['coordinates']['height'],
                    'store_dwell_time': store_metrics['avg_dwell_time_seconds'],
                    'store_bounce_rate': store_metrics['bounce_rate_percentage'],
                    'store_sales_per_visit': store_metrics['sales_per_visit_inr'],
                    'store_conversion_rate': store_metrics['conversion_rate_percentage'],
                    'estimated_view_time': section_metrics['estimated_view_time'],
                    'estimated_engagement': section_metrics['estimated_engagement_score'],
                    'estimated_conversion_contribution': section_metrics['estimated_conversion_contribution'],
                    'position_score': section_metrics['position_factors']['composite_position_score']
                })

        if len(analysis_data) == 0:
            print("❌ No sections with performance data found for analysis")
            return

        df = pd.DataFrame(analysis_data)

        # Part-worth analysis by section type
        type_analysis = self._analyze_part_worth_by_type(df)

        # Position-based analysis
        position_analysis = self._analyze_part_worth_by_position(df)

        # Combined predictive model
        model_analysis = self._build_predictive_model(df)

        self.part_worth_analysis = {
            'summary': {
                'sections_analyzed': len(df),
                'unique_types': df['type'].nunique(),
                'performance_correlation': self._calculate_correlations(df)
            },
            'type_analysis': type_analysis,
            'position_analysis': position_analysis,
            'predictive_model': model_analysis,
            'recommendations': self._generate_recommendations(df, type_analysis, position_analysis)
        }

        print(f"✅ Part-worth analysis complete for {len(df)} sections")

    def _analyze_part_worth_by_type(self, df: pd.DataFrame) -> Dict:
        """Analyze part-worth by section type"""
        type_stats = {}

        for section_type in df['type'].unique():
            type_df = df[df['type'] == section_type]

            type_stats[section_type] = {
                'count': len(type_df),
                'avg_engagement': type_df['estimated_engagement'].mean(),
                'avg_view_time': type_df['estimated_view_time'].mean(),
                'avg_conversion_contribution': type_df['estimated_conversion_contribution'].mean(),
                'performance_score': (
                    type_df['estimated_engagement'].mean() * 0.4 +
                    type_df['estimated_conversion_contribution'].mean() * 100 * 0.6  # Scale up conversion
                ),
                'position_preference': {
                    'avg_y_position': type_df['y'].mean(),
                    'preferred_above_fold': (type_df['y'] < 800).mean()
                }
            }

        # Rank by performance score
        ranked_types = sorted(type_stats.items(), key=lambda x: x[1]['performance_score'], reverse=True)

        return {
            'type_statistics': type_stats,
            'performance_ranking': ranked_types
        }

    def _analyze_part_worth_by_position(self, df: pd.DataFrame) -> Dict:
        """Analyze part-worth by position"""
        # Position clustering
        position_features = df[['x', 'y', 'width', 'height']].values
        scaler = StandardScaler()
        position_scaled = scaler.fit_transform(position_features)

        kmeans = KMeans(n_clusters=5, random_state=42)
        df['position_cluster'] = kmeans.fit_predict(position_scaled)

        cluster_analysis = {}
        for cluster in df['position_cluster'].unique():
            cluster_df = df[df['position_cluster'] == cluster]

            cluster_analysis[f'cluster_{cluster}'] = {
                'section_count': len(cluster_df),
                'avg_performance': cluster_df['estimated_engagement'].mean(),
                'typical_position': {
                    'x_range': [cluster_df['x'].min(), cluster_df['x'].max()],
                    'y_range': [cluster_df['y'].min(), cluster_df['y'].max()],
                    'avg_area': cluster_df['area'].mean()
                },
                'common_types': cluster_df['type'].value_counts().head(3).to_dict()
            }

        return {
            'position_clusters': cluster_analysis,
            'optimal_positions': self._find_optimal_positions(df)
        }

    def _find_optimal_positions(self, df: pd.DataFrame) -> Dict:
        """Find optimal positions for high-performing sections"""
        high_performers = df[df['estimated_engagement'] > df['estimated_engagement'].quantile(0.75)]

        return {
            'high_performance_zones': {
                'y_position_ranges': [(y_min, y_max) for y_min, y_max in
                                    [(0, 400), (400, 800), (800, 1200), (1200, 2000)]
                                    if len(high_performers[
                                        (high_performers['y'] >= y_min) &
                                        (high_performers['y'] < y_max)
                                    ]) > 0],
                'preferred_widths': high_performers['width'].describe().to_dict(),
                'optimal_areas': high_performers['area'].describe().to_dict()
            }
        }

    def _build_predictive_model(self, df: pd.DataFrame) -> Dict:
        """Build predictive model for section performance"""
        # Features for prediction
        feature_cols = ['x', 'y', 'width', 'height', 'area', 'position_score']
        target_col = 'estimated_engagement'

        # Create type dummies
        type_dummies = pd.get_dummies(df['type'], prefix='type')
        features_df = pd.concat([df[feature_cols], type_dummies], axis=1)

        # Train Random Forest model
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        rf_model.fit(features_df, df[target_col])

        # Feature importance
        feature_importance = dict(zip(features_df.columns, rf_model.feature_importances_))

        return {
            'model_score': rf_model.score(features_df, df[target_col]),
            'feature_importance': dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)),
            'top_predictors': list(dict(sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)).keys())[:5]
        }

    def _calculate_correlations(self, df: pd.DataFrame) -> Dict:
        """Calculate correlations between metrics"""
        correlations = df[['estimated_engagement', 'estimated_view_time',
                          'estimated_conversion_contribution', 'position_score',
                          'store_dwell_time', 'store_conversion_rate']].corr()

        return correlations.to_dict()

    def _generate_recommendations(self, df: pd.DataFrame, type_analysis: Dict, position_analysis: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Top performing types
        top_types = [item[0] for item in type_analysis['performance_ranking'][:3]]
        recommendations.append(f"🏆 Prioritize these high-performing section types: {', '.join(top_types)}")

        # Position recommendations
        above_fold_performance = df[df['y'] < 800]['estimated_engagement'].mean()
        below_fold_performance = df[df['y'] >= 800]['estimated_engagement'].mean()

        if above_fold_performance > below_fold_performance * 1.2:
            recommendations.append("📍 Place key conversion sections above the fold (Y < 800px)")

        # Width recommendations
        full_width_perf = df[df['width'] > 1500]['estimated_engagement'].mean()
        partial_width_perf = df[df['width'] <= 1500]['estimated_engagement'].mean()

        if full_width_perf > partial_width_perf * 1.1:
            recommendations.append("📏 Full-width sections (>1500px) show better engagement")

        return recommendations

    def save_enriched_catalog(self):
        """Save enriched catalog with performance data"""
        enriched_catalog = {
            **self.modules_data,
            'modules': self.enriched_sections,
            'performance_analysis': self.part_worth_analysis,
            'metadata': {
                **self.modules_data.get('metadata', {}),
                'performance_enriched': True,
                'analysis_date': pd.Timestamp.now().isoformat()
            }
        }

        # Save enriched catalog
        output_file = self.output_dir / "enriched_modules_catalog.json"
        with open(output_file, 'w') as f:
            json.dump(enriched_catalog, f, indent=2)

        print(f"💾 Saved enriched catalog: {output_file}")

        # Save part-worth analysis separately
        analysis_file = self.output_dir / "part_worth_analysis.json"
        with open(analysis_file, 'w') as f:
            json.dump(self.part_worth_analysis, f, indent=2)

        print(f"📊 Saved part-worth analysis: {analysis_file}")

        # Save recommendations as text
        recommendations_file = self.output_dir / "performance_recommendations.txt"
        with open(recommendations_file, 'w') as f:
            f.write("Performance-Driven Layout Recommendations\n")
            f.write("=" * 45 + "\n\n")
            for i, rec in enumerate(self.part_worth_analysis['recommendations'], 1):
                f.write(f"{i}. {rec}\n")

        print(f"💡 Saved recommendations: {recommendations_file}")

    def run_analysis(self):
        """Run complete performance analysis"""
        print("🚀 Starting Performance Analysis...")

        if not self.load_performance_data():
            return False

        if not self.load_modules_catalog():
            return False

        self.enrich_sections_with_performance()
        self.calculate_part_worth_analysis()
        self.save_enriched_catalog()

        print("\n✅ Performance Analysis Complete!")
        print(f"📈 Analyzed {len(self.enriched_sections)} sections")
        print(f"🎯 Generated {len(self.part_worth_analysis['recommendations'])} recommendations")
        return True

def main():
    analyzer = PerformanceAnalyzer()
    analyzer.run_analysis()

if __name__ == "__main__":
    main()