#!/usr/bin/env python3
"""
MCP Server for LAS file processing scripts
Provides tools for executing Python scripts on LAS files
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, List
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("LAS Scripts Server")

# Base paths for resources
BASE_DIR = Path(__file__).parent.parent
SCRIPTS_DIR = BASE_DIR / "mcp_resources" / "scripts"
LAS_FILES_DIR = BASE_DIR / "mcp_resources" / "las_files"
OUTPUT_DIR = BASE_DIR / "output"

@mcp.tool()
def list_available_scripts() -> List[Dict[str, str]]:
    """List all available Python scripts for LAS file processing"""
    scripts = []
    
    if SCRIPTS_DIR.exists():
        for script_file in SCRIPTS_DIR.glob("*.py"):
            scripts.append({
                "name": script_file.stem,
                "filename": script_file.name,
                "path": str(script_file),
                "description": f"Python script: {script_file.stem}"
            })
    
    return scripts

@mcp.tool()
def list_available_las_files() -> List[Dict[str, str]]:
    """List all available LAS files for processing"""
    las_files = []
    
    if LAS_FILES_DIR.exists():
        for las_file in LAS_FILES_DIR.glob("*.las"):
            las_files.append({
                "name": las_file.stem,
                "filename": las_file.name,
                "path": str(las_file),
                "size": las_file.stat().st_size if las_file.exists() else 0
            })
    
    return las_files

@mcp.tool()
def execute_script(script_name: str, las_file: str, tool: str = None) -> Dict[str, Any]:
    """
    Execute a Python script with the specified LAS file
    
    Args:
        script_name: Name of the script to execute (without .py extension)
        las_file: Name of the LAS file to process
        tool: Optional tool parameter for the script
    
    Returns:
        Dictionary with execution results
    """
    try:
        # Validate script exists
        script_path = SCRIPTS_DIR / f"{script_name}.py"
        if not script_path.exists():
            return {
                "success": False,
                "error": f"Script {script_name}.py not found",
                "available_scripts": [s["name"] for s in list_available_scripts()]
            }
        
        # Validate LAS file exists
        las_path = LAS_FILES_DIR / las_file
        if not las_path.exists():
            return {
                "success": False,
                "error": f"LAS file {las_file} not found",
                "available_files": [f["filename"] for f in list_available_las_files()]
            }
        
        # Create output directory with timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        output_path = OUTPUT_DIR / timestamp
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Prepare command
        cmd = [sys.executable, str(script_path), str(las_path)]
        if tool:
            cmd.extend([tool])
        
        # Execute script
        start_time = datetime.now()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=BASE_DIR,
            timeout=300  # 5 minute timeout
        )
        end_time = datetime.now()
        processing_time = int((end_time - start_time).total_seconds() * 1000)
        
        if result.returncode == 0:
            # Find generated output files
            output_files = []
            if output_path.exists():
                for output_file in output_path.iterdir():
                    if output_file.is_file():
                        output_files.append({
                            "name": output_file.name,
                            "path": str(output_file.relative_to(BASE_DIR)),
                            "full_path": str(output_file)
                        })
            
            return {
                "success": True,
                "script": script_name,
                "las_file": las_file,
                "tool": tool,
                "output_files": output_files,
                "processing_time": processing_time,
                "stdout": result.stdout,
                "stderr": result.stderr if result.stderr else None
            }
        else:
            return {
                "success": False,
                "error": f"Script execution failed with code {result.returncode}",
                "stdout": result.stdout,
                "stderr": result.stderr,
                "processing_time": processing_time
            }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Script execution timed out (300 seconds)",
            "processing_time": 300000
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Execution error: {str(e)}"
        }

@mcp.tool()
def get_script_info(script_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific script"""
    script_path = SCRIPTS_DIR / f"{script_name}.py"
    
    if not script_path.exists():
        return {
            "exists": False,
            "error": f"Script {script_name}.py not found"
        }
    
    try:
        # Read script content to extract docstring and basic info
        content = script_path.read_text()
        
        # Extract docstring (simple approach)
        docstring = ""
        lines = content.split('\n')
        in_docstring = False
        for line in lines:
            if '"""' in line or "'''" in line:
                if in_docstring:
                    break
                else:
                    in_docstring = True
                    if line.strip() not in ['"""', "'''"]:
                        docstring += line.split('"""')[1] if '"""' in line else line.split("'''")[1]
                    continue
            if in_docstring:
                docstring += line + "\n"
        
        return {
            "exists": True,
            "name": script_name,
            "filename": f"{script_name}.py",
            "path": str(script_path),
            "size": script_path.stat().st_size,
            "description": docstring.strip() if docstring else f"Python script: {script_name}",
            "requires_las_file": True,
            "supports_tools": True
        }
    
    except Exception as e:
        return {
            "exists": True,
            "error": f"Error reading script info: {str(e)}"
        }

if __name__ == "__main__":
    # Run the MCP server
    mcp.run(transport="stdio")