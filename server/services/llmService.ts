import axios from 'axios';

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

  constructor() {
    this.endpoint = process.env.OLLAMA_ENDPOINT || 'https://88c46355da8c.ngrok-free.app/';
    this.model = 'llama3.2:1b';
  }

  async analyzeEmailContent(emailBody: string): Promise<LLMResponse> {
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

  async testConnection(): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.endpoint}/api/generate`, {
        model: this.model,
        prompt: 'Test connection. Respond with: OK',
        stream: false,
      }, {
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
