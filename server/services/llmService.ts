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

IMPORTANT: You can ONLY use these available LAS files:
- sample_well_01.las (for basic well data, depth analysis)
- production_well_02.las (for production data, gamma ray analysis)

You must respond with a JSON object containing:
- script: Choose from "depth_visualization.py", "gamma_ray_analyzer.py", or "resistivity_tool.py"
- lasFile: Choose ONLY "sample_well_01.las" or "production_well_02.las" 
- tool: Choose from "depth_plotter", "gamma_analyzer", or "resistivity_tool"
- confidence: A number between 0-1 indicating confidence in the analysis
- reasoning: A brief explanation of why these choices were made

For requests about:
- "plot", "depth", "visualization" → use sample_well_01.las with depth_visualization.py
- "gamma", "gamma_analyzer" → use production_well_02.las with gamma_ray_analyzer.py
- "resistivity" → use sample_well_01.las with resistivity_tool.py

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
        
        // Fallback response using available LAS files
        return {
          script: 'depth_visualization.py',
          lasFile: 'sample_well_01.las',
          tool: 'depth_plotter',
          confidence: 0.1,
          reasoning: 'Failed to parse LLM response, using available LAS file',
        };
      }
    } catch (error) {
      console.error('LLM service error:', error);
      
      // Fallback response for network/API errors using available LAS files
      return {
        script: 'depth_visualization.py',
        lasFile: 'production_well_02.las',
        tool: 'depth_plotter',
        confidence: 0.0,
        reasoning: 'LLM service unavailable, using available LAS file',
      };
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
