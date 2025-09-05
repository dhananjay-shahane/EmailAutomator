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
    // Configure from environment variables with fallback defaults
    this.endpoint = process.env.LLM_ENDPOINT || '';
    this.model = process.env.LLM_MODEL || '';
    this.provider = process.env.LLM_PROVIDER || 'huggingface';
    this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.LLM_API_KEY;
  }

  // Accept configuration from frontend localStorage
  setConfig(config: { provider: string; model: string; endpoint?: string; apiKey?: string }) {
    this.provider = config.provider;
    this.model = config.model;
    
    // Set appropriate endpoint based on provider if not provided
    if (config.endpoint && config.endpoint.trim()) {
      this.endpoint = config.endpoint.replace(/\/$/, '');
    } else {
      // Use default endpoint based on provider
      if (config.provider === 'huggingface') {
        this.endpoint = 'https://api-inference.huggingface.co';
      } else {
        this.endpoint = '';
      }
    }
    
    this.apiKey = config.apiKey;
  }

  // Use default configuration if not provided
  private useDefaults() {
    if (!this.endpoint || !this.provider || !this.model) {
      // Set proper defaults based on provider
      this.provider = process.env.LLM_PROVIDER || 'huggingface';
      if (this.provider === 'huggingface') {
        this.endpoint = process.env.LLM_ENDPOINT || 'https://api-inference.huggingface.co';
        this.model = process.env.LLM_MODEL || 'microsoft/DialoGPT-large';
      } else {
        this.endpoint = process.env.LLM_ENDPOINT || '';
        this.model = process.env.LLM_MODEL || '';
      }
      this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.LLM_API_KEY;
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

Keywords mapping (when no script specified):
- "plot", "depth", "visualization", "chart" → depth_visualization.py + depth_plotter + sample_well_01.las
- "gamma", "gamma ray", "radioactivity" → gamma_ray_analyzer.py + gamma_analyzer + production_well_02.las
- "resistivity", "resistance", "formation evaluation" → resistivity_analyzer.py + resistivity_analyzer + exploration_well_04.las
- "porosity", "neutron", "density", "pore space" → porosity_calculator.py + porosity_calculator + offshore_well_03.las
- "lithology", "rock type", "classification", "formation" → lithology_classifier.py + lithology_classifier + development_well_05.las

CRITICAL: If user specifies a script name OR LAS file, USE EXACTLY what they specify!

Example responses:
{
  "script": "depth_visualization.py",
  "lasFile": "sample_well_01.las",
  "tool": "depth_plotter",
  "confidence": 0.95,
  "reasoning": "Request asks for plot/visualization, using sample well data"
}

{
  "script": "resistivity_analyzer.py",
  "lasFile": "exploration_well_04.las",
  "tool": "resistivity_analyzer",
  "confidence": 0.90,
  "reasoning": "Request asks for resistivity analysis, using exploration data with deep resistivity logs"
}

Respond only with valid JSON:`;

    try {
      let response;
      
      if (this.provider === 'huggingface') {
        // Check if this is a GPT-OSS model (uses different API)
        if (this.model.includes('gpt-oss')) {
          // Use OpenAI-compatible API format for GPT-OSS models
          const routerEndpoint = 'https://router.huggingface.co/v1';
          const fullModelName = this.model.includes(':') ? this.model : `${this.model}:cerebras`;
          
          response = await axios.post(`${routerEndpoint}/chat/completions`, {
            model: fullModelName,
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.7
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 45000,
          });
        } else {
          // Regular Hugging Face inference API format
          response = await axios.post(`${this.endpoint}/models/${this.model}`, {
            inputs: prompt,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              return_full_text: false
            }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 45000,
          });
        }
      } else {
        // Ollama API format (fallback)
        response = await axios.post(`${this.endpoint}/api/generate`, {
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
      }

      let responseText;
      if (this.provider === 'huggingface') {
        if (this.model.includes('gpt-oss')) {
          // GPT-OSS models use OpenAI format
          responseText = response.data.choices[0]?.message?.content;
        } else {
          // Regular Hugging Face models
          responseText = Array.isArray(response.data) ? response.data[0]?.generated_text : response.data.generated_text;
        }
      } else {
        // Ollama format
        responseText = response.data.response;
      }
      
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
    
    console.log(`CheckClarification - Provider: ${this.provider}, Model: ${this.model}, Endpoint: ${this.endpoint}`);
    
    // Validate configuration
    if (this.provider === 'huggingface' && !this.model.includes('gpt-oss') && !this.endpoint) {
      throw new Error('Hugging Face endpoint not configured');
    }
    
    if (this.provider === 'huggingface' && !this.apiKey) {
      throw new Error('Hugging Face API key not configured');
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
      let response;
      
      if (this.provider === 'huggingface') {
        if (this.model.includes('gpt-oss')) {
          // Use OpenAI-compatible API format for GPT-OSS models
          const routerEndpoint = 'https://router.huggingface.co/v1';
          const fullModelName = this.model.includes(':') ? this.model : `${this.model}:cerebras`;
          
          response = await axios.post(`${routerEndpoint}/chat/completions`, {
            model: fullModelName,
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.3
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          });
        } else {
          response = await axios.post(`${this.endpoint}/models/${this.model}`, {
            inputs: prompt,
            parameters: {
              max_new_tokens: 200,
              temperature: 0.3,
              return_full_text: false
            }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 30000,
          });
        }
      } else {
        response = await axios.post(`${this.endpoint}/api/generate`, {
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
      }

      let responseText;
      if (this.provider === 'huggingface') {
        if (this.model.includes('gpt-oss')) {
          // GPT-OSS models use OpenAI format
          responseText = response.data.choices[0]?.message?.content;
        } else {
          // Regular Hugging Face models
          responseText = Array.isArray(response.data) ? response.data[0]?.generated_text : response.data.generated_text;
        }
      } else {
        // Ollama format
        responseText = response.data.response;
      }
      
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
    
    console.log(`Testing LLM connection - Provider: ${this.provider}, Model: ${this.model}, Endpoint: ${this.endpoint}, API Key: ${this.apiKey ? 'Set' : 'Not set'}`);
    
    // For Hugging Face, we need either endpoint or it's a gpt-oss model
    if (this.provider === 'huggingface') {
      if (!this.model) {
        return {
          success: false,
          responseTime: 0,
          error: 'Please configure the model name in settings.'
        };
      }
      
      if (!this.apiKey) {
        return {
          success: false,
          responseTime: 0,
          error: 'Hugging Face API key is required for authentication.'
        };
      }
      
      // GPT-OSS models don't need endpoint configured since they use router
      if (!this.model.includes('gpt-oss') && !this.endpoint) {
        return {
          success: false,
          responseTime: 0,
          error: 'Please configure the endpoint URL in settings or use a GPT-OSS model.'
        };
      }
    } else {
      // For non-Hugging Face providers, we need all fields
      if (!this.endpoint || !this.provider || !this.model) {
        return {
          success: false,
          responseTime: 0,
          error: 'LLM not configured. Please configure provider, model, and endpoint in settings.'
        };
      }
    }
    
    const startTime = Date.now();
    
    try {
      let response;
      
      if (this.provider === 'huggingface') {
        if (this.model.includes('gpt-oss')) {
          // Use OpenAI-compatible API format for GPT-OSS models
          const routerEndpoint = 'https://router.huggingface.co/v1';
          const fullModelName = this.model.includes(':') ? this.model : `${this.model}:cerebras`;
          
          response = await axios.post(`${routerEndpoint}/chat/completions`, {
            model: fullModelName,
            messages: [
              { role: "user", content: "Test connection. Respond with: OK" }
            ],
            max_tokens: 10,
            temperature: 0.1
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 15000,
          });
        } else {
          response = await axios.post(`${this.endpoint}/models/${this.model}`, {
            inputs: 'Test connection. Respond with: OK',
            parameters: {
              max_new_tokens: 10,
              temperature: 0.1,
              return_full_text: false
            }
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            timeout: 15000,
          });
        }
      } else {
        response = await axios.post(`${this.endpoint}/api/generate`, {
          model: this.model,
          prompt: 'Test connection. Respond with: OK',
          stream: false,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        });
      }

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
