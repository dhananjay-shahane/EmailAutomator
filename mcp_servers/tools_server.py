#!/usr/bin/env python3
"""
MCP Server for analysis tools
Provides tools for determining which scripts and tools to use for LAS file processing
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("LAS Tools Server")

# Tool definitions and mappings
AVAILABLE_TOOLS = {
    "depth_plotter": {
        "name": "depth_plotter",
        "description": "Creates depth plots and visualizations from LAS file depth data",
        "compatible_scripts": ["depth_visualization.py"],
        "keywords": ["depth", "plot", "visualization", "curve", "log"],
        "output_type": "visualization"
    },
    "gamma_analyzer": {
        "name": "gamma_analyzer", 
        "description": "Analyzes gamma ray data for geological formations",
        "compatible_scripts": ["gamma_analysis.py"],
        "keywords": ["gamma", "ray", "formation", "geology", "analysis"],
        "output_type": "analysis"
    },
    "porosity_calculator": {
        "name": "porosity_calculator",
        "description": "Calculates porosity from neutron and density logs",
        "compatible_scripts": ["porosity_calculator.py"],
        "keywords": ["porosity", "neutron", "density", "reservoir", "calculation"],
        "output_type": "calculation"
    },
    "permeability_estimator": {
        "name": "permeability_estimator",
        "description": "Estimates permeability from porosity and other log data",
        "compatible_scripts": ["permeability_analysis.py"],
        "keywords": ["permeability", "flow", "reservoir", "estimation", "analysis"],
        "output_type": "estimation"
    },
    "saturation_analyzer": {
        "name": "saturation_analyzer",
        "description": "Analyzes water and hydrocarbon saturation",
        "compatible_scripts": ["saturation_analysis.py"],
        "keywords": ["saturation", "water", "hydrocarbon", "oil", "gas"],
        "output_type": "analysis"
    }
}

@mcp.tool()
def list_available_tools() -> List[Dict[str, Any]]:
    """List all available analysis tools"""
    return list(AVAILABLE_TOOLS.values())

@mcp.tool()
def get_tool_info(tool_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific tool"""
    if tool_name not in AVAILABLE_TOOLS:
        return {
            "exists": False,
            "error": f"Tool '{tool_name}' not found",
            "available_tools": list(AVAILABLE_TOOLS.keys())
        }
    
    return {
        "exists": True,
        **AVAILABLE_TOOLS[tool_name]
    }

@mcp.tool()
def match_tool_to_query(query: str) -> Dict[str, Any]:
    """
    Match user query to the most appropriate tool
    
    Args:
        query: User's query or request
    
    Returns:
        Dictionary with tool recommendation and confidence
    """
    query_lower = query.lower()
    
    # Score each tool based on keyword matches
    tool_scores = {}
    
    for tool_name, tool_info in AVAILABLE_TOOLS.items():
        score = 0
        matched_keywords = []
        
        # Check for keyword matches
        for keyword in tool_info["keywords"]:
            if keyword in query_lower:
                score += 1
                matched_keywords.append(keyword)
        
        # Boost score if tool name is mentioned
        if tool_name.replace("_", " ") in query_lower or tool_name in query_lower:
            score += 2
            matched_keywords.append(tool_name)
        
        if score > 0:
            tool_scores[tool_name] = {
                "score": score,
                "matched_keywords": matched_keywords,
                "tool_info": tool_info
            }
    
    if not tool_scores:
        return {
            "success": False,
            "message": "No matching tools found for the query",
            "query": query,
            "available_tools": list(AVAILABLE_TOOLS.keys())
        }
    
    # Find the best match
    best_tool = max(tool_scores.items(), key=lambda x: x[1]["score"])
    tool_name, tool_data = best_tool
    
    # Calculate confidence (simple approach)
    max_possible_score = len(tool_data["tool_info"]["keywords"]) + 2  # keywords + name match
    confidence = min(tool_data["score"] / max_possible_score, 1.0)
    
    return {
        "success": True,
        "tool": tool_name,
        "confidence": confidence,
        "matched_keywords": tool_data["matched_keywords"],
        "tool_info": tool_data["tool_info"],
        "query": query
    }

@mcp.tool()
def recommend_script_and_tool(query: str, las_file: str = None) -> Dict[str, Any]:
    """
    Recommend both script and tool based on query and optionally LAS file info
    
    Args:
        query: User's query or request
        las_file: Optional LAS file name for context
    
    Returns:
        Dictionary with script and tool recommendations
    """
    # Get tool recommendation
    tool_match = match_tool_to_query(query)
    
    if not tool_match["success"]:
        return {
            "success": False,
            "message": "Could not determine appropriate tool and script",
            "query": query,
            "las_file": las_file
        }
    
    tool_name = tool_match["tool"]
    tool_info = tool_match["tool_info"]
    
    # Get compatible script (for now, assume first one)
    if tool_info["compatible_scripts"]:
        script = tool_info["compatible_scripts"][0]
    else:
        script = f"{tool_name}.py"  # fallback
    
    return {
        "success": True,
        "script": script,
        "tool": tool_name,
        "las_file": las_file if las_file else "sample_well_01.las",  # default fallback
        "confidence": tool_match["confidence"],
        "reasoning": f"Query matched '{tool_name}' based on keywords: {', '.join(tool_match['matched_keywords'])}",
        "query": query,
        "tool_info": tool_info
    }

@mcp.tool()
def validate_script_tool_combination(script: str, tool: str) -> Dict[str, Any]:
    """
    Validate that a script and tool combination is compatible
    
    Args:
        script: Script filename
        tool: Tool name
    
    Returns:
        Dictionary with validation result
    """
    if tool not in AVAILABLE_TOOLS:
        return {
            "valid": False,
            "error": f"Unknown tool: {tool}",
            "available_tools": list(AVAILABLE_TOOLS.keys())
        }
    
    tool_info = AVAILABLE_TOOLS[tool]
    
    # Check if script is compatible with tool
    if script in tool_info["compatible_scripts"]:
        return {
            "valid": True,
            "script": script,
            "tool": tool,
            "tool_info": tool_info
        }
    
    return {
        "valid": False,
        "error": f"Script '{script}' is not compatible with tool '{tool}'",
        "compatible_scripts": tool_info["compatible_scripts"],
        "tool_info": tool_info
    }

@mcp.tool()
def search_tools_by_keywords(keywords: List[str]) -> List[Dict[str, Any]]:
    """
    Search for tools by keywords
    
    Args:
        keywords: List of keywords to search for
    
    Returns:
        List of matching tools with scores
    """
    results = []
    
    for tool_name, tool_info in AVAILABLE_TOOLS.items():
        matches = 0
        matched_keywords = []
        
        for keyword in keywords:
            keyword_lower = keyword.lower()
            if keyword_lower in tool_info["keywords"]:
                matches += 1
                matched_keywords.append(keyword_lower)
        
        if matches > 0:
            results.append({
                "tool": tool_name,
                "score": matches,
                "matched_keywords": matched_keywords,
                "tool_info": tool_info
            })
    
    # Sort by score (highest first)
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results

@mcp.tool()
def get_tools_by_output_type(output_type: str) -> List[Dict[str, Any]]:
    """
    Get tools by their output type
    
    Args:
        output_type: Type of output ("visualization", "analysis", "calculation", "estimation")
    
    Returns:
        List of tools that produce the specified output type
    """
    matching_tools = []
    
    for tool_name, tool_info in AVAILABLE_TOOLS.items():
        if tool_info["output_type"] == output_type:
            matching_tools.append({
                "tool": tool_name,
                "tool_info": tool_info
            })
    
    return matching_tools

if __name__ == "__main__":
    # Run the MCP server
    mcp.run(transport="stdio")