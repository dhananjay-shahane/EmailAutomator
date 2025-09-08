#!/usr/bin/env python3
"""
MCP Server for LAS file resources
Provides access to LAS files and processing resources
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from mcp.server.fastmcp import FastMCP
from mcp.server import NotificationOptions, Server
from mcp.types import Resource, TextResourceContents, BlobResourceContents

# Initialize FastMCP server
mcp = FastMCP("LAS Resources Server")

# Base paths for resources
BASE_DIR = Path(__file__).parent.parent
LAS_FILES_DIR = BASE_DIR / "mcp_resources" / "las_files"
SCRIPTS_DIR = BASE_DIR / "mcp_resources" / "scripts"
OUTPUT_DIR = BASE_DIR / "output"

@mcp.resource("las://files/list")
def list_las_files() -> TextResourceContents:
    """List all available LAS files"""
    las_files = []
    
    if LAS_FILES_DIR.exists():
        for las_file in LAS_FILES_DIR.glob("*.las"):
            file_info = {
                "name": las_file.stem,
                "filename": las_file.name,
                "path": str(las_file.relative_to(BASE_DIR)),
                "size": las_file.stat().st_size,
                "uri": f"las://files/{las_file.stem}"
            }
            las_files.append(file_info)
    
    return TextResourceContents(
        uri="las://files/list",
        text=json.dumps(las_files, indent=2)
    )

@mcp.resource("las://files/{file_name}")
def get_las_file(file_name: str) -> TextResourceContents:
    """Get the contents of a specific LAS file"""
    las_file_path = LAS_FILES_DIR / f"{file_name}.las"
    
    if not las_file_path.exists():
        # Try with .las extension if not provided
        if not file_name.endswith('.las'):
            las_file_path = LAS_FILES_DIR / f"{file_name}.las"
        else:
            las_file_path = LAS_FILES_DIR / file_name
    
    if not las_file_path.exists():
        available_files = [f.stem for f in LAS_FILES_DIR.glob("*.las")] if LAS_FILES_DIR.exists() else []
        error_msg = {
            "error": f"LAS file '{file_name}' not found",
            "available_files": available_files
        }
        return TextResourceContents(
            uri=f"las://files/{file_name}",
            text=json.dumps(error_msg, indent=2)
        )
    
    try:
        content = las_file_path.read_text()
        return TextResourceContents(
            uri=f"las://files/{file_name}",
            text=content
        )
    except Exception as e:
        error_msg = {
            "error": f"Failed to read LAS file: {str(e)}",
            "file": file_name
        }
        return TextResourceContents(
            uri=f"las://files/{file_name}",
            text=json.dumps(error_msg, indent=2)
        )

@mcp.resource("las://scripts/list")
def list_scripts() -> TextResourceContents:
    """List all available processing scripts"""
    scripts = []
    
    if SCRIPTS_DIR.exists():
        for script_file in SCRIPTS_DIR.glob("*.py"):
            script_info = {
                "name": script_file.stem,
                "filename": script_file.name,
                "path": str(script_file.relative_to(BASE_DIR)),
                "size": script_file.stat().st_size,
                "uri": f"las://scripts/{script_file.stem}"
            }
            scripts.append(script_info)
    
    return TextResourceContents(
        uri="las://scripts/list",
        text=json.dumps(scripts, indent=2)
    )

@mcp.resource("las://scripts/{script_name}")
def get_script(script_name: str) -> TextResourceContents:
    """Get the contents of a specific processing script"""
    script_path = SCRIPTS_DIR / f"{script_name}.py"
    
    if not script_path.exists():
        available_scripts = [f.stem for f in SCRIPTS_DIR.glob("*.py")] if SCRIPTS_DIR.exists() else []
        error_msg = {
            "error": f"Script '{script_name}' not found",
            "available_scripts": available_scripts
        }
        return TextResourceContents(
            uri=f"las://scripts/{script_name}",
            text=json.dumps(error_msg, indent=2)
        )
    
    try:
        content = script_path.read_text()
        return TextResourceContents(
            uri=f"las://scripts/{script_name}",
            text=content
        )
    except Exception as e:
        error_msg = {
            "error": f"Failed to read script: {str(e)}",
            "script": script_name
        }
        return TextResourceContents(
            uri=f"las://scripts/{script_name}",
            text=json.dumps(error_msg, indent=2)
        )

@mcp.resource("las://output/list")
def list_output_folders() -> TextResourceContents:
    """List all output folders with generated files"""
    output_folders = []
    
    if OUTPUT_DIR.exists():
        for folder in OUTPUT_DIR.iterdir():
            if folder.is_dir():
                files = []
                for file in folder.iterdir():
                    if file.is_file():
                        files.append({
                            "name": file.name,
                            "path": str(file.relative_to(BASE_DIR)),
                            "size": file.stat().st_size,
                            "uri": f"las://output/{folder.name}/{file.name}"
                        })
                
                folder_info = {
                    "name": folder.name,
                    "path": str(folder.relative_to(BASE_DIR)),
                    "files": files,
                    "uri": f"las://output/{folder.name}"
                }
                output_folders.append(folder_info)
    
    # Sort by folder name (newest first)
    output_folders.sort(key=lambda x: x["name"], reverse=True)
    
    return TextResourceContents(
        uri="las://output/list",
        text=json.dumps(output_folders, indent=2)
    )

@mcp.resource("las://output/{folder_name}")
def get_output_folder(folder_name: str) -> TextResourceContents:
    """Get information about a specific output folder"""
    folder_path = OUTPUT_DIR / folder_name
    
    if not folder_path.exists() or not folder_path.is_dir():
        available_folders = [f.name for f in OUTPUT_DIR.iterdir() if f.is_dir()] if OUTPUT_DIR.exists() else []
        error_msg = {
            "error": f"Output folder '{folder_name}' not found",
            "available_folders": available_folders
        }
        return TextResourceContents(
            uri=f"las://output/{folder_name}",
            text=json.dumps(error_msg, indent=2)
        )
    
    files = []
    for file in folder_path.iterdir():
        if file.is_file():
            files.append({
                "name": file.name,
                "path": str(file.relative_to(BASE_DIR)),
                "size": file.stat().st_size,
                "is_image": file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'],
                "uri": f"las://output/{folder_name}/{file.name}"
            })
    
    folder_info = {
        "name": folder_name,
        "path": str(folder_path.relative_to(BASE_DIR)),
        "files": files,
        "file_count": len(files)
    }
    
    return TextResourceContents(
        uri=f"las://output/{folder_name}",
        text=json.dumps(folder_info, indent=2)
    )

@mcp.tool()
def search_resources(query: str, resource_type: str = "all") -> Dict[str, Any]:
    """
    Search for resources by name or content
    
    Args:
        query: Search query
        resource_type: Type of resource to search ("las", "scripts", "output", or "all")
    
    Returns:
        Dictionary with search results
    """
    results = {
        "query": query,
        "resource_type": resource_type,
        "las_files": [],
        "scripts": [],
        "output_folders": []
    }
    
    query_lower = query.lower()
    
    # Search LAS files
    if resource_type in ["las", "all"] and LAS_FILES_DIR.exists():
        for las_file in LAS_FILES_DIR.glob("*.las"):
            if query_lower in las_file.stem.lower():
                results["las_files"].append({
                    "name": las_file.stem,
                    "filename": las_file.name,
                    "path": str(las_file.relative_to(BASE_DIR)),
                    "uri": f"las://files/{las_file.stem}"
                })
    
    # Search scripts
    if resource_type in ["scripts", "all"] and SCRIPTS_DIR.exists():
        for script_file in SCRIPTS_DIR.glob("*.py"):
            if query_lower in script_file.stem.lower():
                results["scripts"].append({
                    "name": script_file.stem,
                    "filename": script_file.name,
                    "path": str(script_file.relative_to(BASE_DIR)),
                    "uri": f"las://scripts/{script_file.stem}"
                })
    
    # Search output folders
    if resource_type in ["output", "all"] and OUTPUT_DIR.exists():
        for folder in OUTPUT_DIR.iterdir():
            if folder.is_dir() and query_lower in folder.name.lower():
                files = [f.name for f in folder.iterdir() if f.is_file()]
                results["output_folders"].append({
                    "name": folder.name,
                    "path": str(folder.relative_to(BASE_DIR)),
                    "files": files,
                    "uri": f"las://output/{folder.name}"
                })
    
    return results

@mcp.tool()
def get_resource_stats() -> Dict[str, Any]:
    """Get statistics about available resources"""
    stats = {
        "las_files": 0,
        "scripts": 0,
        "output_folders": 0,
        "total_output_files": 0
    }
    
    # Count LAS files
    if LAS_FILES_DIR.exists():
        stats["las_files"] = len(list(LAS_FILES_DIR.glob("*.las")))
    
    # Count scripts
    if SCRIPTS_DIR.exists():
        stats["scripts"] = len(list(SCRIPTS_DIR.glob("*.py")))
    
    # Count output folders and files
    if OUTPUT_DIR.exists():
        folders = [f for f in OUTPUT_DIR.iterdir() if f.is_dir()]
        stats["output_folders"] = len(folders)
        
        total_files = 0
        for folder in folders:
            total_files += len([f for f in folder.iterdir() if f.is_file()])
        stats["total_output_files"] = total_files
    
    return stats

if __name__ == "__main__":
    # Run the MCP server
    mcp.run(transport="stdio")