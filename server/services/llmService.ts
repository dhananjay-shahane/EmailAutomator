import axios from 'axios';
import { storage } from '../storage.js';

export interface LLMResponse {
  script: string;
  lasFile: string;
  tool: string;
  confidence: number;
  reasoning: string;
}

export class LLMService {
  private endpoint: string;
  private model: string;
  private provider: string;
  private apiKey?: string;

  constructor() {
    // Set default Ollama configuration from environment or fallback
    this.endpoint = (process.env.OLLAMA_ENDPOINT || 'https://88c46355da8c.ngrok-free.app').replace(/\/$/, '');
    this.model = 'llama3.2:1b';
    this.provider = 'ollama';
    this.apiKey = undefined;
  }

  private async loadConfig() {
    const config = await storage.getLLMConfig();
    if (config) {
      this.provider = config.provider;
      this.model = config.model;
      this.endpoint = config.endpoint ? config.endpoint.replace(/\/$/, '') : '';
      this.apiKey = config.apiKey;
    } else {
      // No defaults - user must configure
      this.provider = '';
      this.model = '';
      this.endpoint = '';
      this.apiKey = undefined;
    }
  }

  async analyzeEmailContent(emailBody: string): Promise<LLMResponse> {
    // Use the default configuration for Ollama
    // Override with stored config if available
    await this.loadConfig();
    
    // Use defaults if not configured
    if (!this.endpoint) {
      this.endpoint = (process.env.OLLAMA_ENDPOINT || 'https://88c46355da8c.ngrok-free.app').replace(/\/$/, '');
      this.model = 'llama3.2:1b';
      this.provider = 'ollama';
    }
    
    const prompt = `Analyze this email request for LAS (Log ASCII Standard) file processing:

Email content: "${emailBody}"

IMPORTANT: You can ONLY use these EXACT available resources:

SCRIPTS (choose exactly one):
- "depth_visualization.py" → for depth plots, visualizations, general plotting
- "gamma_ray_analyzer.py" → for gamma ray analysis, statistical analysis

LAS FILES (choose exactly one):
- "sample_well_01.las" → for basic well data, depth analysis
- "production_well_02.las" → for production data, gamma ray analysis

TOOLS (must match script):
- "depth_plotter" → use with depth_visualization.py
- "gamma_analyzer" → use with gamma_ray_analyzer.py

You must respond with a JSON object containing:
- script: Choose exactly "depth_visualization.py" OR "gamma_ray_analyzer.py"
- lasFile: Choose exactly "sample_well_01.las" OR "production_well_02.las" 
- tool: Choose exactly "depth_plotter" OR "gamma_analyzer"
- confidence: A number between 0-1 indicating confidence in the analysis
- reasoning: A brief explanation of why these choices were made

Natural language mapping rules:
- "plot", "depth", "visualization", "chart" → depth_visualization.py + depth_plotter + sample_well_01.las
- "gamma", "analysis", "statistical", "analyzer" → gamma_ray_analyzer.py + gamma_analyzer + production_well_02.las

Example response:
{
  "script": "depth_visualization.py",
  "lasFile": "sample_well_01.las",
  "tool": "depth_plotter",
  "confidence": 0.95,
  "reasoning": "Request asks for plot/visualization, using sample well data"
}

Respond only with valid JSON:`;

    try {
      const response = await axios.post(`${this.endpoint}/api/generate`, {
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      });

      const responseText = response.data.response;
      
      try {
        const parsed = JSON.parse(responseText);
        
        // Validate required fields
        if (!parsed.script || !parsed.lasFile || !parsed.tool) {
          throw new Error('Missing required fields in LLM response');
        }

        return {
          script: parsed.script,
          lasFile: parsed.lasFile,
          tool: parsed.tool,
          confidence: parsed.confidence || 0.5,
          reasoning: parsed.reasoning || 'No reasoning provided',
        };
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', responseText);
        throw new Error(`LLM returned invalid response: ${responseText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error('LLM service error:', error);
      throw new Error(`LLM service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkClarification(query: string): Promise<{ needsClarification: boolean; confidence: number; suggestions: string[]; message: string }> {
    // Use defaults if not configured
    if (!this.endpoint) {
      this.endpoint = (process.env.OLLAMA_ENDPOINT || 'https://88c46355da8c.ngrok-free.app').replace(/\/$/, '');
      this.model = 'llama3.2:1b';
      this.provider = 'ollama';
    }

    const prompt = `Analyze this LAS analysis query and determine if it needs clarification:

Query: "${query}"

Available options:
- "gamma ray analysis" using gamma_ray_analyzer.py with production_well_02.las
- "depth visualization" using depth_visualization.py with sample_well_01.las

Respond with JSON containing:
- needsClarification: true if query is unclear or ambiguous
- confidence: 0.0-1.0 confidence in understanding the request
- suggestions: array of clarification options if needed
- message: helpful response message

Example responses:
{
  "needsClarification": false,
  "confidence": 0.9,
  "suggestions": [],
  "message": "I understand you want gamma ray analysis. Let me process that."
}

{
  "needsClarification": true,
  "confidence": 0.3,
  "suggestions": ["Gamma ray analysis with production data", "Depth visualization with sample data", "Tell me more about your analysis goals"],
  "message": "I'm not sure what type of analysis you need. Could you clarify?"
}

Respond only with valid JSON:`;

    try {
      const response = await axios.post(`${this.endpoint}/api/generate`, {
        model: this.model,
        prompt,
        stream: false,
        format: 'json',
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      const responseText = response.data.response;
      
      try {
        const parsed = JSON.parse(responseText);
        return {
          needsClarification: parsed.needsClarification || false,
          confidence: parsed.confidence || 0.5,
          suggestions: parsed.suggestions || [],
          message: parsed.message || 'Let me help you with your analysis request.'
        };
      } catch (parseError) {
        console.error('Failed to parse clarification response as JSON:', responseText);
        // Fallback logic
        const hasGamma = query.toLowerCase().includes('gamma');
        const hasDepth = query.toLowerCase().includes('depth') || query.toLowerCase().includes('plot');
        const hasSpecific = hasGamma || hasDepth;
        
        return {
          needsClarification: !hasSpecific,
          confidence: hasSpecific ? 0.8 : 0.3,
          suggestions: hasSpecific ? [] : [
            "Gamma ray analysis with production_well_02.las",
            "Depth visualization with sample_well_01.las",
            "Tell me more about your specific analysis needs"
          ],
          message: hasSpecific ? 
            "I understand your request. Let me process that for you." :
            "I'm not quite sure what type of analysis you need. Could you clarify?"
        };
      }
    } catch (error) {
      console.error('LLM clarification error:', error);
      // Simple fallback
      const hasGamma = query.toLowerCase().includes('gamma');
      const hasDepth = query.toLowerCase().includes('depth') || query.toLowerCase().includes('plot');
      const hasSpecific = hasGamma || hasDepth;
      
      return {
        needsClarification: !hasSpecific,
        confidence: hasSpecific ? 0.7 : 0.2,
        suggestions: hasSpecific ? [] : [
          "Gamma ray analysis with production_well_02.las",
          "Depth visualization with sample_well_01.las"
        ],
        message: hasSpecific ? 
          "I understand your request. Let me process that for you." :
          "I'm not quite sure what type of analysis you need. Could you clarify?"
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    await this.loadConfig();
    
    if (!this.endpoint || !this.provider || !this.model) {
      return {
        success: false,
        responseTime: 0,
        error: 'LLM not configured. Please configure provider, model, and endpoint in settings.'
      };
    }
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.endpoint}/api/generate`, {
        model: this.model,
        prompt: 'Test connection. Respond with: OK',
        stream: false,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime: responseTime / 1000, // Convert to seconds
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime: responseTime / 1000,
        error: error instanceof Error ? error.message : 'LLM service unavailable',
      };
    }
  }
}
