import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

export interface LangchainAgentStep {
  tool: string;
  action: string;
  result: string;
  confidence: number;
}

export interface LangchainAgentResponse {
  steps: LangchainAgentStep[];
  finalResult: {
    script: string;
    lasFile: string;
    tool: string;
    confidence: number;
    reasoning: string;
  };
}

export interface LangchainQueryResult {
  id: string;
  query: string;
  agentResponse: LangchainAgentResponse;
  outputFile?: string;
  status: "processing" | "completed" | "error";
  errorMessage?: string;
  processingTime?: number;
}

export interface LangchainClarificationResponse {
  needsClarification: boolean;
  confidence: number;
  suggestions: string[];
  message: string;
  agentPlan?: Array<{
    step: number;
    description: string;
    tool: string;
  }>;
}

export class LangchainLlmService {
  private pythonPath: string;
  private mcpServersPath: string;
  private outputPath: string;

  constructor() {
    this.pythonPath = "python3";
    this.mcpServersPath = process.env.MCP_SERVERS_PATH || "./mcp_servers";
    this.outputPath = process.env.MCP_OUTPUT_PATH || "./output";
    
    this.initializeDirectories();
  }

  private initializeDirectories(): void {
    // Create MCP servers directory if it doesn't exist
    if (!fs.existsSync(this.mcpServersPath)) {
      fs.mkdirSync(this.mcpServersPath, { recursive: true });
    }

    // Create the main Langchain agent script if it doesn't exist
    this.createLangchainAgentScript();
  }

  private createLangchainAgentScript(): void {
    const agentScriptPath = path.join(this.mcpServersPath, "langchain_agent.py");
    
    if (!fs.existsSync(agentScriptPath)) {
      const agentScript = `#!/usr/bin/env python3
"""
Langchain MCP Agent for LAS file analysis
This script uses Langchain with MCP adapters to connect to multiple MCP servers
and coordinate intelligent analysis of LAS files.
"""

import asyncio
import json
import sys
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

try:
    from langchain_mcp_adapters.client import MultiServerMCPClient
    from langchain_mcp_adapters.tools import load_mcp_tools
    from langgraph.prebuilt import create_react_agent
    from langchain_openai import ChatOpenAI
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError as e:
    print(f"Error importing required packages: {e}")
    print("Please ensure langchain-mcp-adapters, langgraph, langchain, and related packages are installed")
    sys.exit(1)

class LangchainMCPAgent:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent
        self.mcp_servers_path = self.base_path / "mcp_servers"
        self.output_path = self.base_path / "output"
        self.model = None
        self.mcp_client = None
        self.tools = []
        
    async def initialize_mcp_servers(self):
        """Initialize connection to MCP servers"""
        try:
            # Configure MCP servers
            server_config = {
                "scripts": {
                    "command": "python",
                    "args": [str(self.mcp_servers_path / "scripts_server.py")],
                    "transport": "stdio",
                },
                "resources": {
                    "command": "python", 
                    "args": [str(self.mcp_servers_path / "resources_server.py")],
                    "transport": "stdio",
                },
                "tools": {
                    "command": "python",
                    "args": [str(self.mcp_servers_path / "tools_server.py")],
                    "transport": "stdio",
                }
            }
            
            # Initialize MultiServerMCPClient
            self.mcp_client = MultiServerMCPClient(server_config)
            
            # Load tools from all MCP servers
            self.tools = await self.mcp_client.get_tools()
            
            return True
            
        except Exception as e:
            print(f"Error initializing MCP servers: {e}")
            return False
        
    async def initialize_llm(self, llm_config: Optional[Dict] = None):
        """Initialize the LLM based on configuration"""
        try:
            # Configure LLM based on provided config
            if llm_config and llm_config.get('provider'):
                if llm_config['provider'] == 'openai':
                    self.model = ChatOpenAI(
                        model=llm_config.get('model', 'gpt-3.5-turbo'),
                        api_key=llm_config.get('apiKey'),
                        temperature=0.1
                    )
                elif llm_config['provider'] == 'anthropic':
                    self.model = ChatAnthropic(
                        model=llm_config.get('model', 'claude-3-sonnet-20240229'),
                        api_key=llm_config.get('apiKey'),
                        temperature=0.1
                    )
                else:
                    raise ValueError(f"Unsupported provider: {llm_config['provider']}")
            else:
                # Default to OpenAI if no config provided
                self.model = ChatOpenAI(
                    model='gpt-3.5-turbo',
                    temperature=0.1
                )
                
            return True
            
        except Exception as e:
            print(f"Error initializing LLM: {e}")
            return False

    async def create_agent(self):
        """Create the LangGraph agent with MCP tools"""
        try:
            if not self.model:
                raise ValueError("LLM not initialized")
            if not self.tools:
                raise ValueError("MCP tools not loaded")
                
            # Create the React agent with loaded tools
            self.agent = create_react_agent(self.model, self.tools)
            
            return True
            
        except Exception as e:
            print(f"Error creating agent: {e}")
            return False

    async def process_query(self, query: str) -> Dict[str, Any]:
        """Process a user query using the Langchain agent"""
        try:
            # Prepare the query for the agent
            messages = [
                SystemMessage(content="You are an expert in LAS (Log ASCII Standard) file analysis. Use the available MCP tools to analyze user requests and determine the appropriate scripts, tools, and LAS files to use. Always provide clear reasoning for your decisions."),
                HumanMessage(content=query)
            ]
            
            # Execute the agent
            response = await self.agent.ainvoke({"messages": messages})
            
            # Extract the final recommendation from agent response
            # This is a simplified approach - in practice, you'd parse the agent's tool calls
            agent_steps = []
            
            # For now, use the tools to get a recommendation
            if hasattr(self.mcp_client, 'session'):
                async with self.mcp_client.session("tools") as session:
                    # Use tools server to match query to appropriate tool
                    tools_from_session = await load_mcp_tools(session)
                    
                    # Find the tool matching function
                    for tool in tools_from_session:
                        if tool.name == "match_tool_to_query":
                            tool_result = await tool.ainvoke({"query": query})
                            
                            if tool_result.get("success"):
                                agent_steps.append({
                                    "tool": "match_tool_to_query",
                                    "action": "analyze_query",
                                    "result": json.dumps(tool_result),
                                    "confidence": tool_result.get("confidence", 0.7)
                                })
                                
                                return {
                                    "steps": agent_steps,
                                    "finalResult": {
                                        "script": tool_result.get("script", "depth_visualization.py"),
                                        "lasFile": tool_result.get("las_file", "sample_well_01.las"),
                                        "tool": tool_result.get("tool", "depth_plotter"),
                                        "confidence": tool_result.get("confidence", 0.7),
                                        "reasoning": tool_result.get("reasoning", "Matched based on query analysis")
                                    }
                                }
            
            # Fallback response if MCP tools aren't available
            return {
                "steps": [{
                    "tool": "fallback",
                    "action": "default_analysis",
                    "result": "Used fallback analysis",
                    "confidence": 0.5
                }],
                "finalResult": {
                    "script": "depth_visualization.py",
                    "lasFile": "sample_well_01.las", 
                    "tool": "depth_plotter",
                    "confidence": 0.5,
                    "reasoning": "Fallback: default depth visualization"
                }
            }
            
        except Exception as e:
            print(f"Error processing query: {e}")
            raise e

    async def check_clarification(self, query: str) -> Dict[str, Any]:
        """Check if query needs clarification"""
        try:
            # Simple keyword-based check for now
            query_lower = query.lower()
            
            # Check if query is clear enough
            key_terms = ["las", "log", "well", "depth", "gamma", "porosity", "permeability", "analysis", "plot", "visualization"]
            has_key_terms = any(term in query_lower for term in key_terms)
            
            if len(query.split()) < 3 or not has_key_terms:
                return {
                    "needsClarification": True,
                    "confidence": 0.3,
                    "suggestions": [
                        "Could you specify which type of analysis you need?",
                        "Which LAS file would you like to analyze?",
                        "What kind of visualization or calculation are you looking for?"
                    ],
                    "message": "Could you provide more details about your analysis request?",
                    "agentPlan": [
                        {"step": 1, "description": "Identify analysis type", "tool": "tools_server"},
                        {"step": 2, "description": "Select appropriate script", "tool": "scripts_server"},
                        {"step": 3, "description": "Execute analysis", "tool": "scripts_server"}
                    ]
                }
            else:
                return {
                    "needsClarification": False,
                    "confidence": 0.8,
                    "suggestions": [],
                    "message": "Query is clear for processing",
                    "agentPlan": [
                        {"step": 1, "description": "Analyze query requirements", "tool": "tools_server"},
                        {"step": 2, "description": "Execute selected script", "tool": "scripts_server"}
                    ]
                }
                
        except Exception as e:
            print(f"Error checking clarification: {e}")
            return {
                "needsClarification": True,
                "confidence": 0.0,
                "suggestions": ["Please try rephrasing your request"],
                "message": "Error analyzing your request",
                "agentPlan": None
            }

async def main():
    if len(sys.argv) < 3:
        print("Usage: python langchain_agent.py <action> <query> [config_json]")
        sys.exit(1)
    
    action = sys.argv[1]
    query = sys.argv[2]
    config_json = sys.argv[3] if len(sys.argv) > 3 else "{}"
    
    try:
        config = json.loads(config_json)
    except json.JSONDecodeError:
        config = {}
    
    agent = LangchainMCPAgent()
    
    try:
        # Initialize MCP servers
        mcp_initialized = await agent.initialize_mcp_servers()
        if not mcp_initialized:
            raise Exception("Failed to initialize MCP servers")
        
        # Initialize LLM
        llm_initialized = await agent.initialize_llm(config)
        if not llm_initialized:
            raise Exception("Failed to initialize LLM")
        
        # Create agent
        agent_created = await agent.create_agent()
        if not agent_created:
            raise Exception("Failed to create agent")
        
        if action == "check_clarification":
            result = await agent.check_clarification(query)
        elif action == "process_query":
            result = await agent.process_query(query)
        else:
            raise ValueError(f"Unknown action: {action}")
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "success": False
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
`;

      fs.writeFileSync(agentScriptPath, agentScript);
      console.log(`Created Langchain agent script at: ${agentScriptPath}`);
    }
  }

  async checkClarification(
    query: string,
    config?: {
      provider: string;
      model: string;
      endpoint?: string;
      apiKey?: string;
    }
  ): Promise<LangchainClarificationResponse> {
    try {
      const agentScriptPath = path.join("langchain_scripts", "langchain_agent.py");
      const configJson = config ? JSON.stringify(config) : '{}';
      
      const result = await this.executeScript([
        "langchain_scripts/langchain_agent.py",
        "check_clarification",
        query,
        configJson
      ]);

      if (result.success && result.stdout) {
        try {
          // Find the last complete JSON object in stdout (ignoring error messages)
          const lines = result.stdout.split('\n');
          let jsonStartIndex = -1;
          let jsonEndIndex = -1;
          
          // Find the last occurrence of a line starting with '{'
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('}') && jsonEndIndex === -1) {
              jsonEndIndex = i;
            }
            if (lines[i].trim().startsWith('{') && jsonEndIndex !== -1) {
              jsonStartIndex = i;
              break;
            }
          }
          
          if (jsonStartIndex === -1 || jsonEndIndex === -1) {
            throw new Error('No valid JSON found in agent output');
          }
          
          const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex + 1);
          const jsonString = jsonLines.join('\n');
          const response = JSON.parse(jsonString);
          return response;
        } catch (parseError) {
          console.error('Failed to parse Langchain clarification response:', parseError);
          console.error('Raw stdout:', result.stdout);
          throw new Error(`Failed to parse agent response: ${parseError}`);
        }
      } else {
        throw new Error(`Langchain agent unavailable: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Langchain clarification error:', error);
      throw error;
    }
  }

  async processQuery(
    query: string,
    config?: {
      provider: string;
      model: string;
      endpoint?: string;  
      apiKey?: string;
    }
  ): Promise<LangchainQueryResult> {
    try {
      const agentScriptPath = path.join("langchain_scripts", "langchain_agent.py");
      const configJson = config ? JSON.stringify(config) : '{}';
      
      const result = await this.executeScript([
        "langchain_scripts/langchain_agent.py",
        "process_query",
        query,
        configJson
      ]);

      if (result.success && result.stdout) {
        try {
          // Find the last complete JSON object in stdout (ignoring error messages)
          const lines = result.stdout.split('\n');
          let jsonStartIndex = -1;
          let jsonEndIndex = -1;
          
          // Find the last occurrence of a line starting with '{'
          for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim().startsWith('}') && jsonEndIndex === -1) {
              jsonEndIndex = i;
            }
            if (lines[i].trim().startsWith('{') && jsonEndIndex !== -1) {
              jsonStartIndex = i;
              break;
            }
          }
          
          if (jsonStartIndex === -1 || jsonEndIndex === -1) {
            throw new Error('No valid JSON found in agent output');
          }
          
          const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex + 1);
          const jsonString = jsonLines.join('\n');
          const agentResponse = JSON.parse(jsonString);
          
          return {
            id: `langchain-${Date.now()}`,
            query,
            agentResponse,
            status: "completed",
            processingTime: result.processingTime,
          };
        } catch (parseError) {
          console.error('Failed to parse Langchain query response:', parseError);
          throw new Error(`Failed to parse agent response: ${parseError}`);
        }
      } else {
        throw new Error(`Langchain processing failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Langchain query processing error:', error);
      throw error;
    }
  }

  async testConnection(config?: {
    provider: string;
    model: string;
    endpoint?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Test with a simple clarification check
      const response = await this.checkClarification("test connection", config);
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeScript(args: string[]): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    processingTime?: number;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Set PYTHONPATH to include the langchain_scripts directory
      const env = {
        ...process.env,
        PYTHONPATH: `${process.cwd()}/langchain_scripts:${process.env.PYTHONPATH || ''}`,
        PATH: `/home/runner/workspace/.pythonlibs/bin:${process.env.PATH || ''}`,
      };
      
      const child = spawn(this.pythonPath, args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const processingTime = Date.now() - startTime;
        
        console.log(`Langchain script execution: exit code ${code}`);
        console.log(`Langchain script stdout:`, stdout);
        console.log(`Langchain script stderr:`, stderr);
        
        if (code === 0) {
          resolve({
            success: true,
            stdout: stdout.trim(),
            stderr: stderr.trim() || undefined,
            processingTime
          });
        } else {
          console.error('Langchain script stderr:', stderr);
          resolve({
            success: false,
            stdout: stdout.trim() || undefined,
            stderr: stderr.trim(),
            error: `Langchain script execution failed with code ${code}: ${stderr}`,
            processingTime
          });
        }
      });

      child.on('error', (error) => {
        const processingTime = Date.now() - startTime;
        resolve({
          success: false,
          error: `Failed to execute Langchain script: ${error.message}`,
          processingTime
        });
      });
    });
  }
}

// Export singleton instance
export const langchainLlmService = new LangchainLlmService();