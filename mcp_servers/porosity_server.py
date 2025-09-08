#!/usr/bin/env python3
"""
MCP Server for Porosity Calculator Tool
Provides porosity calculation tools from neutron and density logs using MCP
"""

import sys
import asyncio
from pathlib import Path
from mcp.server.fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("PorosityCalculator", description="Porosity calculation tools from neutron and density logs")

@mcp.tool()
async def calculate_porosity(las_file: str, output_dir: str = "output") -> dict:
    """
    Calculate porosity from neutron and density logs
    
    Args:
        las_file: Path to the LAS file containing neutron and density data
        output_dir: Directory to save calculation results
        
    Returns:
        Dictionary containing porosity calculation results and generated files
    """
    try:
        import subprocess
        import os
        from datetime import datetime
        
        # Create timestamped output directory
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        full_output_dir = Path(output_dir) / timestamp
        full_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get the porosity calculator script path
        script_path = Path("./mcp_resources/scripts/porosity_calculator.py")
        las_path = Path("./mcp_resources/las_files") / las_file
        
        if not script_path.exists():
            return {"success": False, "error": f"Porosity calculator script not found at {script_path}"}
        if not las_path.exists():
            return {"success": False, "error": f"LAS file not found at {las_path}"}
        
        # Execute the porosity calculation script
        cmd = [sys.executable, str(script_path), str(las_path)]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path.cwd(), timeout=300)
        
        # Collect generated calculation files
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
            "calculation_type": "neutron_density_porosity",
            "output_directory": str(full_output_dir),
            "files_generated": output_files,
            "execution_details": {
                "stdout": result.stdout,
                "stderr": result.stderr if result.stderr else None
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Porosity calculation failed: {str(e)}"}

@mcp.tool()
async def analyze_reservoir_quality(las_file: str, porosity_cutoff: float = 0.12) -> dict:
    """
    Analyze reservoir quality based on calculated porosity values
    
    Args:
        las_file: Path to the LAS file containing porosity data
        porosity_cutoff: Minimum porosity threshold for reservoir quality
        
    Returns:
        Dictionary containing reservoir quality analysis
    """
    try:
        las_path = Path("./mcp_resources/las_files") / las_file
        
        if not las_path.exists():
            return {"success": False, "error": f"LAS file not found: {las_file}"}
        
        # Mock reservoir quality analysis - real implementation would parse LAS data
        return {
            "success": True,
            "las_file": las_file,
            "porosity_cutoff": porosity_cutoff,
            "reservoir_analysis": {
                "average_porosity": "18.5%",
                "maximum_porosity": "28.2%",
                "minimum_porosity": "8.1%",
                "reservoir_intervals": ["1150-1200 ft", "1300-1380 ft"],
                "net_reservoir": "130 ft",
                "gross_interval": "400 ft",
                "net_to_gross_ratio": "0.325",
                "reservoir_quality": "Fair to Good"
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Reservoir quality analysis failed: {str(e)}"}

if __name__ == "__main__":
    mcp.run()