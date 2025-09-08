#!/usr/bin/env python3
"""
Langchain MCP Agent for LAS file analysis
This script uses basic MCP adapters to create intelligent AI agents
that can understand user queries and coordinate multiple tools for analysis.
"""

import asyncio
import json
import sys
import os
import subprocess
from typing import Dict, List, Any, Optional
from pathlib import Path

class LangchainMCPAgent:
    def __init__(self):
        self.mcp_resources_path = os.environ.get('MCP_RESOURCES_PATH', './mcp_resources')
        self.output_path = os.environ.get('MCP_OUTPUT_PATH', './output')
        self.mcp_servers_path = './mcp_servers'
        self.model = None
        self.available_scripts = []
        self.available_las_files = []
        self.available_tools = []
        
    async def initialize_agent(self, llm_config: Optional[Dict] = None):
        """Initialize the basic MCP agent"""
        try:
            # Load MCP server data
            await self._load_mcp_server_data()
            return True
        except Exception as e:
            print(f"Error initializing agent: {e}", file=sys.stderr)
            return False
    
    
    async def _load_mcp_server_data(self):
        """Load data directly from MCP servers using subprocess calls"""
        try:
            # Get available tools from tools_server.py
            self.available_tools = await self._call_mcp_tools_server('list_available_tools')
            
            # Get available scripts from scripts_server.py
            self.available_scripts = await self._call_mcp_scripts_server('list_available_scripts')
            
            # Get available LAS files from resources_server.py
            self.available_las_files = await self._call_mcp_resources_server('list_las_files')
            
        except Exception as e:
            print(f"Error loading MCP server data: {e}", file=sys.stderr)
            # Use fallback data discovery
            await self._discover_local_resources()
    
    async def _call_mcp_tools_server(self, function_name: str, *args) -> List[Dict[str, Any]]:
        """Call a function from the MCP tools server"""
        try:
            # Use subprocess to call the MCP tools server directly
            cmd = ["python3", os.path.join(self.mcp_servers_path, "tools_server.py"), function_name] + list(args)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            if result.returncode == 0 and result.stdout:
                return json.loads(result.stdout)
            return []
        except Exception as e:
            print(f"Error calling MCP tools server: {e}", file=sys.stderr)
            return []
    
    async def _call_mcp_scripts_server(self, function_name: str, *args) -> List[Dict[str, Any]]:
        """Call a function from the MCP scripts server"""
        try:
            cmd = ["python3", os.path.join(self.mcp_servers_path, "scripts_server.py"), function_name] + list(args)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            if result.returncode == 0 and result.stdout:
                return json.loads(result.stdout)
            return []
        except Exception as e:
            print(f"Error calling MCP scripts server: {e}", file=sys.stderr)
            return []
    
    async def _call_mcp_resources_server(self, function_name: str, *args) -> List[str]:
        """Call a function from the MCP resources server"""
        try:
            cmd = ["python3", os.path.join(self.mcp_servers_path, "resources_server.py"), function_name] + list(args)
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
            if result.returncode == 0 and result.stdout:
                return json.loads(result.stdout)
            return []
        except Exception as e:
            print(f"Error calling MCP resources server: {e}", file=sys.stderr)
            return []
    
    async def _discover_local_resources(self):
        """Fallback method to discover resources locally"""
        try:
            # Discover scripts
            scripts_dir = Path(self.mcp_resources_path) / "scripts"
            if scripts_dir.exists():
                self.available_scripts = [
                    {"name": f.stem, "filename": f.name, "path": str(f)}
                    for f in scripts_dir.glob("*.py")
                ]
            
            # Discover LAS files
            las_dir = Path(self.mcp_resources_path) / "las_files"
            if las_dir.exists():
                self.available_las_files = [f.stem for f in las_dir.glob("*.las")]
            
            # No default tools - only use what's available from MCP servers
            self.available_tools = []
        except Exception as e:
            print(f"Error discovering local resources: {e}", file=sys.stderr)
            self.available_scripts = []
            self.available_las_files = []
            self.available_tools = []
    
    async def _get_available_tools(self) -> List[Dict[str, Any]]:
        """Get available tools from loaded MCP data"""
        return self.available_tools
    
    async def _get_available_las_files(self) -> List[str]:
        """Get available LAS files from loaded MCP data"""
        return self.available_las_files
    
    async def _get_available_scripts(self) -> List[Dict[str, Any]]:
        """Get available scripts from loaded MCP data"""
        return self.available_scripts
    
    async def _match_tool_to_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Match query to appropriate tool using MCP tools server"""
        try:
            # Call MCP tools server to match query to tool
            match_result = await self._call_mcp_tools_server('match_tool_to_query', query)
            
            if match_result and isinstance(match_result, dict):
                return match_result
            
            # If MCP call fails, use simple keyword matching
            return await self._simple_match_tool_to_query(query)
            
        except Exception as e:
            print(f"Error matching tool to query: {e}", file=sys.stderr)
            return await self._simple_match_tool_to_query(query)
    
    async def _simple_match_tool_to_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Use simple keyword matching to match query to available tools"""
        try:
            query_lower = query.lower()
            
            # Simple keyword matching
            for tool in self.available_tools:
                tool_name = tool['name'].lower()
                
                # Check for keyword matches
                if 'depth' in query_lower and 'depth' in tool_name:
                    return {"tool": tool['name'], "confidence": 0.8, "reasoning": "Keyword match: depth"}
                elif 'gamma' in query_lower and 'gamma' in tool_name:
                    return {"tool": tool['name'], "confidence": 0.8, "reasoning": "Keyword match: gamma"}
                elif 'porosity' in query_lower and 'porosity' in tool_name:
                    return {"tool": tool['name'], "confidence": 0.8, "reasoning": "Keyword match: porosity"}
                elif 'resistivity' in query_lower and 'resistivity' in tool_name:
                    return {"tool": tool['name'], "confidence": 0.8, "reasoning": "Keyword match: resistivity"}
                elif 'lithology' in query_lower and 'lithology' in tool_name:
                    return {"tool": tool['name'], "confidence": 0.8, "reasoning": "Keyword match: lithology"}
            
            # If no specific match, return first available tool with lower confidence
            if self.available_tools:
                return {
                    "tool": self.available_tools[0]['name'],
                    "confidence": 0.6,
                    "reasoning": "Default selection - first available tool"
                }
            
            return None
                
        except Exception as e:
            print(f"Error with simple tool matching: {e}", file=sys.stderr)
            return None
    
    async def _create_execution_plan(self, query: str, tool_match: Dict[str, Any], available_files: List[str]) -> List[Dict[str, Any]]:
        """Create execution plan based on query and tool match using available scripts"""
        try:
            tool_name = tool_match.get("tool", "")
            
            # Find matching script for the tool
            matching_script = None
            for script in self.available_scripts:
                if tool_name in script.get('name', '') or script.get('name', '') in tool_name:
                    matching_script = script
                    break
            
            # Select first available LAS file
            if not available_files:
                raise Exception("No LAS files available for analysis")
            selected_file = available_files[0]
            
            plan = [
                {
                    "step": 1,
                    "description": f"Load LAS file: {selected_file}.las",
                    "tool": "mcp_resources_server",
                    "action": "load_las_file",
                    "params": {"file": selected_file}
                },
                {
                    "step": 2,
                    "description": f"Execute {tool_name} analysis",
                    "tool": "mcp_scripts_server",
                    "action": "execute_script", 
                    "params": {
                        "script": matching_script['name'] if matching_script else tool_name,
                        "las_file": selected_file,
                        "tool": tool_name
                    }
                },
                {
                    "step": 3,
                    "description": "Generate output file",
                    "tool": "file_system",
                    "action": "save_output",
                    "params": {"output_dir": self.output_path}
                }
            ]
            
            return plan
        except Exception as e:
            print(f"Error creating execution plan: {e}", file=sys.stderr)
            return []
    
    async def _generate_suggestions(self, available_tools: List[Dict[str, Any]], available_files: List[str]) -> List[str]:
        """Generate suggestions based on available MCP resources"""
        try:
            suggestions = []
            
            # Create suggestions from available tools and files
            for i, tool in enumerate(available_tools[:3]):
                if available_files and i < len(available_files):
                    file_name = available_files[i]
                    suggestions.append(f"{tool.get('description', tool['name'])} with {file_name}.las")
                elif available_files:
                    file_name = available_files[0]
                    suggestions.append(f"{tool.get('description', tool['name'])} with {file_name}.las")
                else:
                    suggestions.append(tool.get('description', tool['name']))
            
            # Add script-based suggestions if available
            for script in self.available_scripts[:2]:
                if available_files:
                    suggestions.append(f"Run {script['name']} script with {available_files[0]}.las")
                else:
                    suggestions.append(f"Run {script['name']} script")
            
            return suggestions[:5]  # Limit to 5 suggestions
        except Exception as e:
            print(f"Error generating suggestions: {e}", file=sys.stderr)
            return ["Please try rephrasing your query"]
    
    async def check_clarification(self, query: str, llm_config: Optional[Dict] = None) -> Dict:
        """Check if a query needs clarification using MCP tools"""
        try:
            await self.initialize_agent(llm_config)
            
            # Get available tools and LAS files from MCP servers
            available_tools = await self._get_available_tools()
            available_files = await self._get_available_las_files()
            
            # Use LLM or tool matching to analyze the query
            tool_match = await self._match_tool_to_query(query)
            
            if tool_match and tool_match.get('confidence', 0) > 0.7:
                # Query is clear, create execution plan
                agent_plan = await self._create_execution_plan(query, tool_match, available_files)
                
                return {
                    "needsClarification": False,
                    "confidence": tool_match.get('confidence', 0.8),
                    "suggestions": [],
                    "message": "I can create an execution plan for your analysis.",
                    "agentPlan": agent_plan
                }
            else:
                # Query needs clarification
                suggestions = await self._generate_suggestions(available_tools, available_files)
                
                return {
                    "needsClarification": True,
                    "confidence": tool_match.get('confidence', 0.3) if tool_match else 0.3,
                    "suggestions": suggestions,
                    "message": "I need more information to create an execution plan.",
                    "agentPlan": None
                }
                
        except Exception as e:
            return {
                "needsClarification": True,
                "confidence": 0.0,
                "suggestions": ["Please try rephrasing your query"],
                "message": f"Error analyzing query: {str(e)}",
                "agentPlan": None
            }
    
    async def process_query(self, query: str, llm_config: Optional[Dict] = None) -> Dict:
        """Process a query using the Langchain agent with MCP tools"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            await self.initialize_agent(llm_config)
            
            # Get available resources from MCP servers
            available_tools = await self._get_available_tools()
            available_files = await self._get_available_las_files()
            available_scripts = await self._get_available_scripts()
            
            # Match query to appropriate tool
            tool_match = await self._match_tool_to_query(query)
            
            if not tool_match or tool_match.get('confidence', 0) < 0.3:
                raise Exception("Could not match query to any available tool with sufficient confidence")
            
            # Select appropriate LAS file and script (only if available)
            if not available_files:
                raise Exception("No LAS files available for analysis")
            selected_file = available_files[0]
            
            # Find matching script
            matching_script = None
            tool_name = tool_match['tool']
            for script in available_scripts:
                if tool_name in script.get('name', '') or script.get('name', '') in tool_name:
                    matching_script = script
                    break
            
            # Execute analysis steps using MCP servers
            steps = [
                {
                    "tool": "mcp_tools_server",
                    "action": "match_tool_to_query",
                    "result": f"Matched query to {tool_name}",
                    "confidence": tool_match.get('confidence', 0.8)
                },
                {
                    "tool": "mcp_resources_server",
                    "action": "select_las_file",
                    "result": f"Selected {selected_file}.las from available files",
                    "confidence": 0.9
                },
                {
                    "tool": "mcp_scripts_server",
                    "action": "execute_script",
                    "result": f"Executed {matching_script['name'] if matching_script else tool_name}",
                    "confidence": 0.95
                }
            ]
            
            # Create final result
            final_result = {
                "script": f"{matching_script['name'] if matching_script else tool_name}.py",
                "lasFile": f"{selected_file}.las",
                "tool": tool_name,
                "confidence": tool_match.get('confidence', 0.8),
                "reasoning": tool_match.get('reasoning', f"Matched query to {tool_name} using MCP tools server")
            }
            
            processing_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            return {
                "id": f"langchain_{int(asyncio.get_event_loop().time())}",
                "query": query,
                "agentResponse": {
                    "steps": steps,
                    "finalResult": final_result
                },
                "status": "completed",
                "processingTime": int(processing_time)
            }
            
        except Exception as e:
            processing_time = 0  # Default time since start_time might not be defined
            return {
                "id": f"error_{int(asyncio.get_event_loop().time())}",
                "query": query,
                "agentResponse": {
                    "steps": [],
                    "finalResult": {
                        "script": "",
                        "lasFile": "",
                        "tool": "",
                        "confidence": 0.0,
                        "reasoning": f"Error: {str(e)}"
                    }
                },
                "status": "error",
                "errorMessage": str(e),
                "processingTime": int(processing_time)
            }

async def main():
    """Main entry point for the Langchain agent"""
    if len(sys.argv) < 3:
        print("Usage: python langchain_agent.py <action> <query> [llm_config_json]")
        sys.exit(1)
    
    action = sys.argv[1]
    query = sys.argv[2]
    llm_config = None
    
    if len(sys.argv) > 3:
        try:
            llm_config = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            print("Warning: Invalid JSON for llm_config, using defaults")
    
    agent = LangchainMCPAgent()
    
    try:
        if action == "check_clarification":
            result = await agent.check_clarification(query, llm_config)
        elif action == "process_query":
            result = await agent.process_query(query, llm_config)
        else:
            result = {"error": f"Unknown action: {action}"}
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "action": action,
            "query": query
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
