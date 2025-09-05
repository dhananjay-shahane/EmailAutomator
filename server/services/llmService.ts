 import axios from 'axios';
import { mcpResourceService } from './mcpResourceService.js';

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

  // Accept configuration from frontend localStorage
  setConfig(config: { provider: string; model: string; endpoint?: string; apiKey?: string }) {
    this.provider = config.provider;
    this.model = config.model;
    this.endpoint = config.endpoint ? config.endpoint.replace(/\/$/, '') : '';
    this.apiKey = config.apiKey;
  }

  // Use default configuration if not provided
  private useDefaults() {
    if (!this.endpoint || !this.provider || !this.model) {
      this.endpoint = (process.env.OLLAMA_ENDPOINT || 'https://88c46355da8c.ngrok-free.app').replace(/\/$/, '');
      this.model = 'llama3.2:1b';
      this.provider = 'ollama';
      this.apiKey = undefined;
    }
  }

  async analyzeEmailContent(emailBody: string, config?: { provider: string; model: string; endpoint?: string; apiKey?: string }): Promise<LLMResponse> {
    // Use provided config or defaults
    if (config) {
      this.setConfig(config);
    } else {
      this.useDefaults();
    }
    
    // Get MCP resources for the LLM
    await mcpResourceService.discoverResources();
    const resourceInfo = mcpResourceService.getResourcesForLLM();
    
    const prompt = `Analyze this email request for LAS (Log ASCII Standard) file processing:

Email content: "${emailBody}"

${resourceInfo}

IMPORTANT: You can ONLY use these EXACT available resources:

SCRIPTS (choose exactly one):
- "depth_visualization.py" → for depth plots, visualizations, general plotting
- "gamma_ray_analyzer.py" → for gamma ray analysis, statistical analysis
- "resistivity_analyzer.py" → for resistivity analysis and formation evaluation
- "porosity_calculator.py" → for porosity calculations from neutron/density logs
- "lithology_classifier.py" → for rock type classification and lithology analysis

LAS FILES (choose exactly one):
- "sample_well_01.las" → for basic well data, depth analysis
- "production_well_02.las" → for production data, gamma ray analysis
- "offshore_well_03.las" → for offshore drilling data, comprehensive logs
- "exploration_well_04.las" → for exploration data, deep resistivity analysis
- "development_well_05.las" → for development data, advanced logging suite

TOOLS (must match script EXACTLY):
- "depth_plotter" → ONLY use with depth_visualization.py
- "gamma_analyzer" → ONLY use with gamma_ray_analyzer.py
- "resistivity_analyzer" → ONLY use with resistivity_analyzer.py
- "porosity_calculator" → ONLY use with porosity_calculator.py
- "lithology_classifier" → ONLY use with lithology_classifier.py

You must respond with a JSON object containing:
- script: Choose exactly one from: "depth_visualization.py", "gamma_ray_analyzer.py", "resistivity_analyzer.py", "porosity_calculator.py", "lithology_classifier.py"
- lasFile: Choose exactly one from: "sample_well_01.las", "production_well_02.las", "offshore_well_03.las", "exploration_well_04.las", "development_well_05.las"
- tool: Choose exactly one from: "depth_plotter", "gamma_analyzer", "resistivity_analyzer", "porosity_calculator", "lithology_classifier"
- confidence: A number between 0-1 indicating confidence in the analysis
- reasoning: A brief explanation of why these choices were made

STRICT mapping rules (FOLLOW EXACTLY):
- ANY mention of "depth_visualization.py" → depth_visualization.py + depth_plotter + sample_well_01.las
- ANY mention of "gamma_ray_analyzer.py" → gamma_ray_analyzer.py + gamma_analyzer + production_well_02.las
- ANY mention of "resistivity_analyzer.py" → resistivity_analyzer.py + resistivity_analyzer + exploration_well_04.las
- ANY mention of "porosity_calculator.py" → porosity_calculator.py + porosity_calculator + offshore_well_03.las
- ANY mention of "lithology_classifier.py" → lithology_classifier.py + lithology_classifier + development_well_05.las

Keywords mapping (when no script specified) - USE FIRST MATCH FOUND:
Priority order (most specific first):
1. "gamma", "gamma ray", "radioactivity" → gamma_ray_analyzer.py + gamma_analyzer + production_well_02.las
2. "resistivity", "resistance", "formation evaluation" → resistivity_analyzer.py + resistivity_analyzer + exploration_well_04.las
3. "porosity", "neutron", "density", "pore space" → porosity_calculator.py + porosity_calculator + offshore_well_03.las
4. "lithology", "rock type", "classification", "formation" → lithology_classifier.py + lithology_classifier + development_well_05.las
5. "plot", "depth", "visualization", "chart" → depth_visualization.py + depth_plotter + sample_well_01.las

CRITICAL: If ANY of the first 4 keywords are found, DO NOT use depth_visualization.py!
Examples:
- "create gamma ray plot" = GAMMA RAY → gamma_ray_analyzer.py (NOT depth_visualization.py)
- "resistivity visualization" = RESISTIVITY → resistivity_analyzer.py (NOT depth_visualization.py)
- "porosity chart" = POROSITY → porosity_calculator.py (NOT depth_visualization.py)

CRITICAL: If user specifies a script name OR LAS file, USE EXACTLY what they specify!

Example responses:
{
  "script": "gamma_ray_analyzer.py",
  "lasFile": "production_well_02.las",
  "tool": "gamma_analyzer",
  "confidence": 0.95,
  "reasoning": "Request mentions gamma ray, using gamma ray analysis with production well data"
}

{
  "script": "resistivity_analyzer.py",
  "lasFile": "exploration_well_04.las",
  "tool": "resistivity_analyzer",
  "confidence": 0.90,
  "reasoning": "Request asks for resistivity analysis, using exploration data with deep resistivity logs"
}

{
  "script": "depth_visualization.py",
  "lasFile": "sample_well_01.las",
  "tool": "depth_plotter",
  "confidence": 0.85,
  "reasoning": "Request asks for basic plotting/visualization only, using sample well data"
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
      
      // Use MCP resource service as intelligent fallback
      console.log('LLM unavailable, using MCP resource service fallback...');
      const fallbackResult = await mcpResourceService.findBestMatch(emailBody);
      
      return {
        script: fallbackResult.script,
        lasFile: fallbackResult.lasFile,
        tool: fallbackResult.tool,
        confidence: 0.7, // Lower confidence since we're using fallback
        reasoning: `${fallbackResult.reasoning} (LLM unavailable, used resource matching)`
      };
    }
  }

  async checkClarification(query: string, config?: { provider: string; model: string; endpoint?: string; apiKey?: string }): Promise<{ needsClarification: boolean; confidence: number; suggestions: string[]; message: string }> {
    // Use provided config or defaults
    if (config) {
      this.setConfig(config);
    } else {
      this.useDefaults();
    }

    const prompt = `Analyze this LAS analysis query and determine if it needs clarification:

Query: "${query}"

Available options:
- "depth visualization" using depth_visualization.py with sample_well_01.las
- "gamma ray analysis" using gamma_ray_analyzer.py with production_well_02.las
- "resistivity analysis" using resistivity_analyzer.py with exploration_well_04.las
- "porosity calculation" using porosity_calculator.py with offshore_well_03.las
- "lithology classification" using lithology_classifier.py with development_well_05.las

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
  "suggestions": [
    "Depth visualization with sample_well_01.las", 
    "Gamma ray analysis with production_well_02.las",
    "Resistivity analysis with exploration_well_04.las",
    "Porosity calculation with offshore_well_03.las",
    "Lithology classification with development_well_05.las"
  ],
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
        throw new Error('Invalid JSON response from LLM service');
      }
    } catch (error) {
      console.error('LLM clarification error:', error);
      throw new Error(`LLM service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(config?: { provider: string; model: string; endpoint?: string; apiKey?: string }): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    // Use provided config or defaults
    if (config) {
      this.setConfig(config);
    } else {
      this.useDefaults();
    }
    
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
