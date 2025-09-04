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

You must respond with a JSON object containing:
- script: The Python script name to use (e.g., "depth_visualization.py", "gamma_ray_analyzer.py", "resistivity_tool.py")
- lasFile: The LAS file name mentioned or inferred from the request
- tool: The specific MCP tool to use (e.g., "depth_plotter", "gamma_analyzer", "resistivity_tool")
- confidence: A number between 0-1 indicating confidence in the analysis
- reasoning: A brief explanation of why these choices were made

Example response:
{
  "script": "depth_visualization.py",
  "lasFile": "sample_well_01.las",
  "tool": "depth_plotter",
  "confidence": 0.95,
  "reasoning": "Request specifically asks for depth analysis of sample_well_01.las file"
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
        
        // Fallback response
        return {
          script: 'depth_visualization.py',
          lasFile: 'unknown.las',
          tool: 'depth_plotter',
          confidence: 0.1,
          reasoning: 'Failed to parse LLM response, using default values',
        };
      }
    } catch (error) {
      console.error('LLM service error:', error);
      
      // Fallback response for network/API errors
      return {
        script: 'depth_visualization.py',
        lasFile: 'unknown.las',
        tool: 'depth_plotter',
        confidence: 0.0,
        reasoning: 'LLM service unavailable, using default values',
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
        timeout: 10000,
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        responseTime: responseTime / 1000, // Convert to seconds
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
