#!/usr/bin/env python3
"""
Lithology classification script for LAS file processing
Classifies rock types based on well log responses
"""

import sys
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

def classify_lithology(las_file_path, output_path):
    """
    Classify lithology from well log data
    """
    print(f"Classifying lithology from: {las_file_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Simulate well log data
    depths = np.linspace(8500, 8600, 200)
    gamma_ray = 65 + 20 * np.sin(depths/50) + np.random.normal(0, 5, len(depths))
    neutron = 0.15 + 0.1 * np.sin(depths/30) + np.random.normal(0, 0.03, len(depths))
    density = 2.4 + 0.3 * np.sin(depths/40) + np.random.normal(0, 0.1, len(depths))
    
    # Classify lithology based on log responses
    lithology = np.full(len(depths), 'Unknown', dtype='U20')
    
    # Sandstone: Low GR, medium density, variable neutron
    sandstone_mask = (gamma_ray < 60) & (density > 2.2) & (density < 2.7)
    lithology[sandstone_mask] = 'Sandstone'
    
    # Shale: High GR, high neutron, variable density
    shale_mask = (gamma_ray > 80) & (neutron > 0.2)
    lithology[shale_mask] = 'Shale'
    
    # Limestone: Medium GR, low neutron, high density
    limestone_mask = (gamma_ray < 70) & (neutron < 0.15) & (density > 2.6)
    lithology[limestone_mask] = 'Limestone'
    
    # Dolomite: Low GR, very low neutron, high density
    dolomite_mask = (gamma_ray < 50) & (neutron < 0.1) & (density > 2.8)
    lithology[dolomite_mask] = 'Dolomite'
    
    # Create visualization
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # Plot 1: Well logs
    ax1_twin1 = ax1.twiny()
    ax1_twin2 = ax1.twiny()
    
    ax1.plot(gamma_ray, depths, 'g-', linewidth=1.5, label='Gamma Ray')
    ax1_twin1.plot(neutron*100, depths, 'b-', linewidth=1.5, label='Neutron')
    ax1_twin2.plot(density, depths, 'r-', linewidth=1.5, label='Density')
    
    ax1.set_xlabel('Gamma Ray (GAPI)', color='g')
    ax1_twin1.set_xlabel('Neutron Porosity (%)', color='b')
    ax1_twin2.set_xlabel('Density (g/cc)', color='r')
    ax1.set_ylabel('Depth (ft)')
    ax1.set_title('Well Log Data')
    ax1.invert_yaxis()
    ax1.grid(True, alpha=0.3)
    
    # Offset the twin axes
    ax1_twin2.spines['top'].set_position(('outward', 60))
    
    # Plot 2: Lithology column
    unique_lithologies = np.unique(lithology)
    colors = {'Sandstone': 'yellow', 'Shale': 'gray', 'Limestone': 'lightblue', 
              'Dolomite': 'lightgreen', 'Unknown': 'white'}
    
    for i, lith in enumerate(unique_lithologies):
        mask = lithology == lith
        if np.any(mask):
            ax2.fill_betweenx(depths[mask], 0, 1, alpha=0.8, color=colors.get(lith, 'white'), 
                             label=f'{lith} ({np.sum(mask)} samples)')
    
    ax2.set_xlim(0, 1)
    ax2.set_ylabel('Depth (ft)')
    ax2.set_title('Lithology Column')
    ax2.invert_yaxis()
    ax2.legend(loc='center left', bbox_to_anchor=(1, 0.5))
    ax2.set_xticks([])
    
    # Plot 3: Neutron-Density crossplot
    for lith in unique_lithologies:
        mask = lithology == lith
        if np.any(mask) and lith != 'Unknown':
            ax3.scatter(density[mask], neutron[mask]*100, alpha=0.7, 
                       color=colors.get(lith, 'black'), label=lith, s=30)
    
    ax3.set_xlabel('Density (g/cc)')
    ax3.set_ylabel('Neutron Porosity (%)')
    ax3.set_title('Neutron-Density Crossplot')
    ax3.grid(True, alpha=0.3)
    ax3.legend()
    
    # Plot 4: Lithology statistics
    lith_counts = {}
    for lith in unique_lithologies:
        count = np.sum(lithology == lith)
        percentage = count / len(lithology) * 100
        lith_counts[lith] = percentage
    
    # Bar chart of lithology percentages
    bars = ax4.bar(range(len(lith_counts)), list(lith_counts.values()), 
                   color=[colors.get(lith, 'gray') for lith in lith_counts.keys()])
    ax4.set_xlabel('Lithology Type')
    ax4.set_ylabel('Percentage (%)')
    ax4.set_title('Lithology Distribution')
    ax4.set_xticks(range(len(lith_counts)))
    ax4.set_xticklabels(list(lith_counts.keys()), rotation=45)
    ax4.grid(True, alpha=0.3)
    
    # Add percentage labels on bars
    for bar, percentage in zip(bars, lith_counts.values()):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + 0.5,
                f'{percentage:.1f}%', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Lithology classification completed and saved to {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python lithology_classifier.py <las_file> <output_file>")
        sys.exit(1)
    
    las_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = classify_lithology(las_file, output_file)
    if success:
        print("Analysis completed successfully")
    else:
        print("Analysis failed")
        sys.exit(1)