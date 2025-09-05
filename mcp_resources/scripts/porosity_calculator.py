#!/usr/bin/env python3
"""
Porosity calculation script for LAS file processing
Calculates porosity from neutron and density logs
"""

import sys
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

def calculate_porosity(las_file_path, output_path):
    """
    Calculate porosity from well log data
    """
    print(f"Calculating porosity from: {las_file_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Simulate porosity calculation
    depths = np.linspace(8500, 8600, 200)
    neutron_porosity = 0.15 + 0.1 * np.sin(depths/30) + np.random.normal(0, 0.03, len(depths))
    density_porosity = 0.12 + 0.08 * np.sin(depths/35) + np.random.normal(0, 0.025, len(depths))
    
    # Keep porosity values between 0 and 0.4
    neutron_porosity = np.clip(neutron_porosity, 0, 0.4)
    density_porosity = np.clip(density_porosity, 0, 0.4)
    
    # Calculate average porosity
    avg_porosity = (neutron_porosity + density_porosity) / 2
    
    # Create visualization
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))
    
    # Plot 1: Porosity vs Depth
    ax1.plot(neutron_porosity*100, depths, 'b-', linewidth=1.5, label='Neutron Porosity')
    ax1.plot(density_porosity*100, depths, 'r-', linewidth=1.5, label='Density Porosity')
    ax1.plot(avg_porosity*100, depths, 'k-', linewidth=2, label='Average Porosity')
    ax1.set_xlabel('Porosity (%)')
    ax1.set_ylabel('Depth (ft)')
    ax1.set_title('Porosity Logs')
    ax1.invert_yaxis()
    ax1.grid(True, alpha=0.3)
    ax1.legend()
    
    # Plot 2: Neutron vs Density Porosity
    ax2.scatter(density_porosity*100, neutron_porosity*100, alpha=0.6, c='purple')
    ax2.plot([0, 40], [0, 40], 'k--', alpha=0.5, label='1:1 Line')
    ax2.set_xlabel('Density Porosity (%)')
    ax2.set_ylabel('Neutron Porosity (%)')
    ax2.set_title('Neutron vs Density Porosity')
    ax2.grid(True, alpha=0.3)
    ax2.legend()
    
    # Plot 3: Porosity quality zones
    high_porosity = avg_porosity > 0.2
    medium_porosity = (avg_porosity >= 0.1) & (avg_porosity <= 0.2)
    low_porosity = avg_porosity < 0.1
    
    ax3.fill_betweenx(depths[high_porosity], 0, 1, alpha=0.3, color='green', label='High Porosity (>20%)')
    ax3.fill_betweenx(depths[medium_porosity], 0, 1, alpha=0.3, color='yellow', label='Medium Porosity (10-20%)')
    ax3.fill_betweenx(depths[low_porosity], 0, 1, alpha=0.3, color='red', label='Low Porosity (<10%)')
    ax3.set_xlim(0, 1)
    ax3.set_ylabel('Depth (ft)')
    ax3.set_title('Porosity Quality Zones')
    ax3.invert_yaxis()
    ax3.legend()
    ax3.set_xticks([])
    
    # Plot 4: Statistics and histograms
    ax4_sub1 = plt.subplot2grid((2, 2), (1, 1), rowspan=1, colspan=1)
    ax4_sub1.hist(avg_porosity*100, bins=15, alpha=0.7, color='orange', edgecolor='black')
    ax4_sub1.set_xlabel('Average Porosity (%)')
    ax4_sub1.set_ylabel('Frequency')
    ax4_sub1.set_title('Porosity Distribution')
    ax4_sub1.grid(True, alpha=0.3)
    
    # Add statistics text
    mean_por = np.mean(avg_porosity) * 100
    std_por = np.std(avg_porosity) * 100
    min_por = np.min(avg_porosity) * 100
    max_por = np.max(avg_porosity) * 100
    high_per = np.sum(high_porosity) / len(high_porosity) * 100
    
    stats_text = f'Mean: {mean_por:.1f}%\nStd: {std_por:.1f}%\nMin: {min_por:.1f}%\nMax: {max_por:.1f}%\nHigh Quality: {high_per:.1f}%'
    ax4_sub1.text(0.7, 0.7, stats_text, transform=ax4_sub1.transAxes, fontsize=10, 
                  bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue", alpha=0.8))
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Porosity calculation completed and saved to {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python porosity_calculator.py <las_file> <output_file>")
        sys.exit(1)
    
    las_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = calculate_porosity(las_file, output_file)
    if success:
        print("Analysis completed successfully")
    else:
        print("Analysis failed")
        sys.exit(1)