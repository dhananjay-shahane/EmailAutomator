#!/usr/bin/env python3
"""
MCP Server for Gamma Ray Analyzer Tool
Provides gamma ray analysis tools for geological formation identification using MCP
"""

import sys
import asyncio
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("GammaRayAnalyzer")

@mcp.tool()
async def analyze_gamma_ray_formations(las_file: str, output_dir: str = "output") -> dict:
    """
    Analyze gamma ray data for geological formation identification
    
    Args:
        las_file: Path to the LAS file containing gamma ray data
        output_dir: Directory to save analysis results
        
    Returns:
        Dictionary containing gamma ray analysis results and generated files
    """
    try:
        import subprocess
        import os
        from datetime import datetime
        
        # Create timestamped output directory
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        full_output_dir = Path(output_dir) / timestamp
        full_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get the gamma ray analyzer script path
        script_path = Path("./mcp_resources/scripts/gamma_ray_analyzer.py")
        las_path = Path("./mcp_resources/las_files") / las_file
        
        if not script_path.exists():
            return {"success": False, "error": f"Gamma ray analyzer script not found at {script_path}"}
        if not las_path.exists():
            return {"success": False, "error": f"LAS file not found at {las_path}"}
        
        # Execute the gamma ray analysis script
        cmd = [sys.executable, str(script_path), str(las_path)]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path.cwd(), timeout=300)
        
        # Collect generated analysis files
        output_files = []
        if full_output_dir.exists():
            for output_file in full_output_dir.iterdir():
                if output_file.is_file():
                    output_files.append({
                        "name": output_file.name,
                        "path": str(output_file.relative_to(Path.cwd())),
                        "full_path": str(output_file)
                    })
        
        return {
            "success": result.returncode == 0,
            "las_file": las_file,
            "analysis_type": "gamma_ray_formation_identification",
            "output_directory": str(full_output_dir),
            "files_generated": output_files,
            "execution_details": {
                "stdout": result.stdout,
                "stderr": result.stderr if result.stderr else None
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Gamma ray analysis failed: {str(e)}"}

@mcp.tool()
async def calculate_formation_properties(las_file: str, depth_range: str = None) -> dict:
    """
    Calculate geological formation properties from gamma ray data
    
    Args:
        las_file: Path to the LAS file containing gamma ray data
        depth_range: Optional depth range to analyze (e.g., "1000-1500")
        
    Returns:
        Dictionary containing formation property calculations
    """
    try:
        las_path = Path("./mcp_resources/las_files") / las_file
        
        if not las_path.exists():
            return {"success": False, "error": f"LAS file not found: {las_file}"}
        
        # Mock formation properties calculation - real implementation would parse LAS data
        return {
            "success": True,
            "las_file": las_file,
            "depth_range": depth_range or "full_well",
            "formation_properties": {
                "average_gamma_ray": "65 API",
                "formation_types": ["Shale", "Sandstone", "Limestone"],
                "clean_intervals": ["1200-1250 ft", "1400-1450 ft"],
                "clay_content": "25-40%",
                "net_to_gross": "0.65"
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Formation properties calculation failed: {str(e)}"}

if __name__ == "__main__":
    mcp.run()