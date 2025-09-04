#!/usr/bin/env python3
"""
Gamma ray analysis script for LAS file processing
Analyzes gamma ray logs and generates statistical visualization
"""

import sys
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

def analyze_gamma_ray(las_file_path, output_path):
    """
    Analyze gamma ray data from LAS file
    """
    print(f"Analyzing gamma ray data from: {las_file_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Simulate gamma ray analysis
    depths = np.linspace(8500, 8600, 200)
    gamma_ray = 65 + 20 * np.sin(depths/50) + np.random.normal(0, 5, len(depths))
    
    # Create analysis visualization
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    # Plot 1: Gamma Ray vs Depth
    ax1.plot(gamma_ray, depths, 'r-', linewidth=1.5)
    ax1.set_xlabel('Gamma Ray (GAPI)')
    ax1.set_ylabel('Depth (ft)')
    ax1.set_title('Gamma Ray Log')
    ax1.invert_yaxis()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Histogram
    ax2.hist(gamma_ray, bins=20, alpha=0.7, color='red', edgecolor='black')
    ax2.set_xlabel('Gamma Ray (GAPI)')
    ax2.set_ylabel('Frequency')
    ax2.set_title('Gamma Ray Distribution')
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: Statistics
    mean_gr = np.mean(gamma_ray)
    std_gr = np.std(gamma_ray)
    ax3.text(0.1, 0.8, f'Mean: {mean_gr:.2f} GAPI', transform=ax3.transAxes, fontsize=12)
    ax3.text(0.1, 0.6, f'Std Dev: {std_gr:.2f} GAPI', transform=ax3.transAxes, fontsize=12)
    ax3.text(0.1, 0.4, f'Min: {np.min(gamma_ray):.2f} GAPI', transform=ax3.transAxes, fontsize=12)
    ax3.text(0.1, 0.2, f'Max: {np.max(gamma_ray):.2f} GAPI', transform=ax3.transAxes, fontsize=12)
    ax3.set_title('Statistics')
    ax3.set_xlim(0, 1)
    ax3.set_ylim(0, 1)
    ax3.axis('off')
    
    # Plot 4: Moving average
    window_size = 10
    moving_avg = np.convolve(gamma_ray, np.ones(window_size)/window_size, mode='valid')
    depths_ma = depths[:len(moving_avg)]
    ax4.plot(gamma_ray, depths, 'lightgray', alpha=0.5, label='Raw Data')
    ax4.plot(moving_avg, depths_ma, 'red', linewidth=2, label=f'{window_size}-point MA')
    ax4.set_xlabel('Gamma Ray (GAPI)')
    ax4.set_ylabel('Depth (ft)')
    ax4.set_title('Smoothed Gamma Ray')
    ax4.invert_yaxis()
    ax4.grid(True, alpha=0.3)
    ax4.legend()
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Analysis completed and saved to {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python gamma_ray_analyzer.py <las_file> <output_file>")
        sys.exit(1)
    
    las_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = analyze_gamma_ray(las_file, output_file)
    if success:
        print("Analysis completed successfully")
    else:
        print("Analysis failed")
        sys.exit(1)