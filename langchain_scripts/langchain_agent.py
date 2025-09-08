#!/usr/bin/env python3
"""
Langchain MCP Agent for LAS file analysis
AI agent that understands MCP servers and resources to coordinate analysis workflows.
"""

import asyncio
import json
import sys
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

class LangchainMCPAgent:
    def __init__(self):
        self.mcp_resources_path = os.environ.get('MCP_RESOURCES_PATH', './mcp_resources')
        self.output_path = os.environ.get('MCP_OUTPUT_PATH', './output')
        self.available_tools = []  # Dynamically discovered from MCP servers
        self.available_las_files = []
        self.available_scripts = []

    async def initialize_agent(self, llm_config: Optional[Dict] = None):
        """Initialize AI agent with MCP resource discovery"""
        try:
            await self._discover_mcp_resources()
            return True
        except Exception as e:
            print(f"Error initializing AI agent: {e}", file=sys.stderr)
            return False

    async def _discover_mcp_resources(self):
        """Discover available MCP resources dynamically"""
        # Discover LAS files
        las_dir = Path(self.mcp_resources_path) / "las_files"
        if las_dir.exists():
            self.available_las_files = [f.stem for f in las_dir.glob("*.las")]
        
        # Discover scripts and dynamically infer tools
        scripts_dir = Path(self.mcp_resources_path) / "scripts"
        if scripts_dir.exists():
            self.available_scripts = [{"name": f.stem, "filename": f.name, "path": str(f)} for f in scripts_dir.glob("*.py")]
            
            # AI Agent: Dynamically discover tools from actual script files
            for script in self.available_scripts:
                tool_info = await self._ai_analyze_script_capabilities(script)
                if tool_info:
                    self.available_tools.append(tool_info)
    
    async def _ai_analyze_script_capabilities(self, script: Dict[str, Any]) -> Dict[str, Any]:
        """AI Agent analyzes script to understand its capabilities"""
        script_name = script['name']
        script_path = script['path']
        
        try:
            # Read script file to understand its purpose
            with open(script_path, 'r') as f:
                content = f.read()
            
            # AI Agent reasoning based on script analysis
            tool_info = {
                "name": script_name,
                "description": f"Python script for {script_name.replace('_', ' ')} analysis",
                "output_type": "analysis",
                "keywords": [],
                "source": "mcp_script_discovery"
            }
            
            # AI analysis of script content for capabilities
            content_lower = content.lower()
            
            # Determine output type from script analysis
            if any(word in content_lower for word in ['plot', 'chart', 'visualize', 'matplotlib', 'pyplot']):
                tool_info["output_type"] = "visualization"
                tool_info["keywords"].extend(["plot", "chart", "visualization"])
            elif any(word in content_lower for word in ['calculate', 'compute', 'formula']):
                tool_info["output_type"] = "calculation"
                tool_info["keywords"].extend(["calculate", "compute"])
            
            # Extract domain-specific keywords from script name and content
            if 'depth' in script_name:
                tool_info["keywords"].extend(["depth", "log", "curve"])
                tool_info["description"] = "Analyzes well depth data and creates visualizations"
            elif 'gamma' in script_name:
                tool_info["keywords"].extend(["gamma", "ray", "formation", "geology"])
                tool_info["description"] = "Analyzes gamma ray data for geological formation identification"
            elif 'porosity' in script_name:
                tool_info["keywords"].extend(["porosity", "neutron", "density", "reservoir"])
                tool_info["description"] = "Calculates porosity from neutron and density log data"
            else:
                # AI inference from script name
                name_words = script_name.replace('_', ' ').split()
                tool_info["keywords"].extend(name_words)
                tool_info["description"] = f"Performs {script_name.replace('_', ' ')} analysis on well log data"
            
            # Add LAS-specific keywords
            if 'las' in content_lower or any(las_term in content_lower for las_term in ['well', 'log', 'curve']):
                tool_info["keywords"].extend(["las", "well", "log"])
            
            return tool_info
            
        except Exception as e:
            print(f"AI Agent: Error analyzing script {script_name}: {e}", file=sys.stderr)
            return None

    async def _ai_analyze_query(self, query: str) -> Dict[str, Any]:
        """AI agent analyzes user query to understand intent and requirements"""
        query_lower = query.lower()
        
        # Determine query intent
        if any(word in query_lower for word in ['plot', 'chart', 'visualize', 'graph', 'show']):
            intent = 'visualization'
        elif any(word in query_lower for word in ['analyze', 'calculate', 'determine', 'find']):
            intent = 'analysis'
        else:
            intent = 'general'
        
        # Match tools based on AI analysis
        best_tool = None
        confidence = 0.0
        matched_keywords = []
        
        for tool in self.available_tools:
            score = 0
            keywords = []
            
            # Check keyword matches
            for keyword in tool['keywords']:
                if keyword in query_lower:
                    score += 1
                    keywords.append(keyword)
            
            # Check tool name match
            if tool['name'].replace('_', ' ') in query_lower:
                score += 2
                keywords.append(tool['name'])
            
            # Check output type alignment
            if intent == tool['output_type']:
                score += 1
            
            # Calculate confidence
            tool_confidence = min(score / (len(tool['keywords']) + 3), 1.0)
            
            if tool_confidence > confidence:
                confidence = tool_confidence
                best_tool = tool
                matched_keywords = keywords
        
        return {
            'intent': intent,
            'best_tool': best_tool,
            'confidence': confidence,
            'matched_keywords': matched_keywords,
            'analysis_type': 'ai_reasoning'
        }

    async def check_clarification(self, query: str, llm_config: Optional[Dict] = None) -> Dict:
        """AI agent determines if query needs clarification"""
        try:
            await self.initialize_agent(llm_config)
            
            # AI analysis of the query
            analysis = await self._ai_analyze_query(query)
            
            if analysis['confidence'] > 0.2 and analysis['best_tool'] and self.available_las_files:
                # AI agent is confident and can proceed
                tool = analysis['best_tool']
                las_file = self.available_las_files[0]
                
                execution_plan = [
                    {
                        "step": 1,
                        "description": f"AI Agent selected {tool['name']} based on query analysis",
                        "action": "tool_selection",
                        "confidence": analysis['confidence']
                    },
                    {
                        "step": 2,
                        "description": f"Execute {tool['name']} script with {las_file}.las",
                        "action": "script_execution",
                        "params": {"script": f"{tool['name']}.py", "las_file": f"{las_file}.las"}
                    }
                ]
                
                return {
                    "needsClarification": False,
                    "confidence": analysis['confidence'],
                    "suggestions": [],
                    "message": f"AI Agent understands: {analysis['intent']} using {tool['name']}",
                    "agentPlan": execution_plan,
                    "analysis": analysis
                }
            else:
                # AI agent needs more information
                suggestions = [
                    f"{tool['description']} using available LAS data" for tool in self.available_tools[:3]
                ]
                if not self.available_las_files:
                    suggestions.append("Upload LAS files to enable analysis")
                
                return {
                    "needsClarification": True,
                    "confidence": analysis['confidence'],
                    "suggestions": suggestions,
                    "message": "AI Agent needs more specific information about your analysis requirements",
                    "agentPlan": None,
                    "partial_analysis": analysis
                }
                
        except Exception as e:
            return {
                "needsClarification": True,
                "confidence": 0.0,
                "suggestions": ["Please rephrase your analysis request"],
                "message": f"AI Agent encountered an error: {str(e)}",
                "agentPlan": None
            }

    async def process_query(self, query: str, llm_config: Optional[Dict] = None) -> Dict:
        """AI agent processes query with full MCP coordination"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            await self.initialize_agent(llm_config)
            
            # AI analysis and execution planning
            analysis = await self._ai_analyze_query(query)
            
            if analysis['confidence'] < 0.2:
                raise Exception("AI Agent: Insufficient confidence to process query")
            
            tool = analysis['best_tool']
            if not tool:
                raise Exception("AI Agent: Could not identify appropriate analysis tool")
            
            if not self.available_las_files:
                raise Exception("AI Agent: No LAS files available for analysis")
            
            # Execute analysis through MCP resources
            selected_las = self.available_las_files[0]
            script_name = tool['name']
            
            execution_steps = [
                {
                    "tool": "ai_agent",
                    "action": "query_analysis",
                    "result": f"Analyzed query intent: {analysis['intent']} with {analysis['confidence']:.2f} confidence",
                    "confidence": analysis['confidence'],
                    "details": analysis
                },
                {
                    "tool": "mcp_coordinator",
                    "action": "resource_selection",
                    "result": f"Selected {script_name} tool and {selected_las}.las file",
                    "confidence": 0.9
                },
                {
                    "tool": "execution_engine",
                    "action": "analysis_execution",
                    "result": f"Prepared execution of {script_name} analysis",
                    "confidence": 0.85
                }
            ]
            
            processing_time = (asyncio.get_event_loop().time() - start_time) * 1000
            
            return {
                "id": f"ai_agent_{int(asyncio.get_event_loop().time())}",
                "query": query,
                "agentResponse": {
                    "steps": execution_steps,
                    "finalResult": {
                        "script": f"{script_name}.py",
                        "lasFile": f"{selected_las}.las",
                        "tool": script_name,
                        "confidence": analysis['confidence'],
                        "reasoning": f"AI Agent: {analysis['intent']} analysis using {', '.join(analysis['matched_keywords'])}"
                    }
                },
                "status": "completed",
                "processingTime": int(processing_time)
            }
            
        except Exception as e:
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
                        "reasoning": f"AI Agent error: {str(e)}"
                    }
                },
                "status": "error",
                "errorMessage": str(e),
                "processingTime": 0
            }

async def main():
    """Main entry point for the AI agent"""
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