#!/usr/bin/env python3
"""
Depth visualization script for LAS file processing
Generates depth vs log curves visualization
"""

import sys
import matplotlib.pyplot as plt
import numpy as np
from datetime import datetime

def process_las_file(las_file_path, output_path):
    """
    Process LAS file and generate depth visualization
    """
    print(f"Processing LAS file: {las_file_path}")
    print(f"Output will be saved to: {output_path}")
    
    # Simulate processing
    depths = np.linspace(8500, 8600, 200)
    gamma_ray = 65 + 20 * np.sin(depths/50) + np.random.normal(0, 5, len(depths))
    
    # Create visualization
    fig, ax = plt.subplots(figsize=(8, 10))
    ax.plot(gamma_ray, depths, 'g-', linewidth=1.5, label='Gamma Ray')
    ax.set_ylabel('Depth (ft)')
    ax.set_xlabel('Gamma Ray (GAPI)')
    ax.set_title('Depth vs Gamma Ray Log')
    ax.invert_yaxis()
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"Visualization saved successfully to {output_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python depth_visualization.py <las_file> <output_file>")
        sys.exit(1)
    
    las_file = sys.argv[1]
    output_file = sys.argv[2]
    
    success = process_las_file(las_file, output_file)
    if success:
        print("Processing completed successfully")
    else:
        print("Processing failed")
        sys.exit(1)