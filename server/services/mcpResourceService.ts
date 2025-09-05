import fs from 'fs';
import path from 'path';

export interface MCPScript {
  name: string;
  path: string;
  description: string;
  tool: string;
  suitableFor: string[];
}

export interface MCPLasFile {
  name: string;
  path: string;
  description: string;
  logs: string[];
  wellType: string;
}

export interface MCPResources {
  scripts: MCPScript[];
  lasFiles: MCPLasFile[];
  tools: string[];
}

class MCPResourceService {
  private resources: MCPResources | null = null;

  async discoverResources(): Promise<MCPResources> {
    if (this.resources) {
      return this.resources;
    }

    const scriptsDir = path.join(process.cwd(), 'mcp_resources', 'scripts');
    const lasFilesDir = path.join(process.cwd(), 'mcp_resources', 'las_files');

    // Discover scripts
    const scripts: MCPScript[] = [];
    if (fs.existsSync(scriptsDir)) {
      const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.py'));
      
      for (const scriptFile of scriptFiles) {
        const scriptPath = path.join(scriptsDir, scriptFile);
        const content = fs.readFileSync(scriptPath, 'utf-8');
        
        // Extract metadata from script content
        scripts.push(this.parseScriptMetadata(scriptFile, content));
      }
    }

    // Discover LAS files
    const lasFiles: MCPLasFile[] = [];
    if (fs.existsSync(lasFilesDir)) {
      const lasFileList = fs.readdirSync(lasFilesDir).filter(f => f.endsWith('.las'));
      
      for (const lasFile of lasFileList) {
        const lasPath = path.join(lasFilesDir, lasFile);
        const content = fs.readFileSync(lasPath, 'utf-8');
        
        // Extract metadata from LAS file content
        lasFiles.push(this.parseLasMetadata(lasFile, content));
      }
    }

    // Define available tools
    const tools = scripts.map(s => s.tool);

    this.resources = { scripts, lasFiles, tools };
    return this.resources;
  }

  private parseScriptMetadata(filename: string, content: string): MCPScript {
    const name = filename;
    const path = `scripts/${filename}`;
    
    // Extract description and metadata from comments
    let description = '';
    let tool = '';
    let suitableFor: string[] = [];

    if (filename === 'depth_visualization.py') {
      description = 'Creates depth-based visualization plots from LAS well log data';
      tool = 'depth_plotter';
      suitableFor = ['depth analysis', 'visualization', 'plotting', 'charts'];
    } else if (filename === 'gamma_ray_analyzer.py') {
      description = 'Analyzes gamma ray logs for radioactivity and formation evaluation';
      tool = 'gamma_analyzer';
      suitableFor = ['gamma ray', 'radioactivity', 'formation evaluation', 'statistical analysis'];
    } else if (filename === 'resistivity_analyzer.py') {
      description = 'Analyzes resistivity logs for formation evaluation and hydrocarbon detection';
      tool = 'resistivity_analyzer';
      suitableFor = ['resistivity', 'formation evaluation', 'hydrocarbon detection', 'electrical properties'];
    } else if (filename === 'porosity_calculator.py') {
      description = 'Calculates porosity from neutron and density logs';
      tool = 'porosity_calculator';
      suitableFor = ['porosity', 'neutron logs', 'density logs', 'pore space', 'reservoir quality'];
    } else if (filename === 'lithology_classifier.py') {
      description = 'Classifies rock types using multiple log responses';
      tool = 'lithology_classifier';
      suitableFor = ['lithology', 'rock classification', 'formation typing', 'geology'];
    }

    return { name, path, description, tool, suitableFor };
  }

  private parseLasMetadata(filename: string, content: string): MCPLasFile {
    const name = filename;
    const path = `las_files/${filename}`;
    
    // Extract logs from LAS file header
    const logs: string[] = [];
    const lines = content.split('\n');
    let inCurveSection = false;
    
    for (const line of lines) {
      if (line.startsWith('~C') || line.includes('CURVE INFORMATION')) {
        inCurveSection = true;
        continue;
      }
      if (line.startsWith('~') && inCurveSection) {
        break;
      }
      if (inCurveSection && line.trim() && !line.startsWith('#')) {
        const parts = line.split('.');
        if (parts.length > 0) {
          const logName = parts[0].trim();
          if (logName && !logs.includes(logName)) {
            logs.push(logName);
          }
        }
      }
    }

    // Define metadata based on filename
    let description = '';
    let wellType = '';

    if (filename === 'sample_well_01.las') {
      description = 'Basic well log data with depth, gamma ray, and resistivity measurements';
      wellType = 'development';
    } else if (filename === 'production_well_02.las') {
      description = 'Production well data with comprehensive gamma ray analysis logs';
      wellType = 'production';
    } else if (filename === 'offshore_well_03.las') {
      description = 'Offshore drilling data with neutron and density porosity logs';
      wellType = 'offshore';
    } else if (filename === 'exploration_well_04.las') {
      description = 'Deep exploration data with comprehensive resistivity logging suite';
      wellType = 'exploration';
    } else if (filename === 'development_well_05.las') {
      description = 'Development well with advanced logging suite for lithology analysis';
      wellType = 'development';
    }

    return { name, path, description, logs, wellType };
  }

  getResourcesForLLM(): string {
    if (!this.resources) {
      return 'No MCP resources discovered yet.';
    }

    const { scripts, lasFiles } = this.resources;

    let output = 'AVAILABLE MCP RESOURCES:\n\n';
    
    output += '📁 SCRIPTS (@mcp.tool):\n';
    scripts.forEach(script => {
      output += `  • ${script.name}\n`;
      output += `    Tool: ${script.tool}\n`;
      output += `    Purpose: ${script.description}\n`;
      output += `    Best for: ${script.suitableFor.join(', ')}\n\n`;
    });

    output += '📄 LAS FILES (@mcp.resource):\n';
    lasFiles.forEach(file => {
      output += `  • ${file.name}\n`;
      output += `    Type: ${file.wellType} well\n`;
      output += `    Description: ${file.description}\n`;
      output += `    Available logs: ${file.logs.slice(0, 5).join(', ')}${file.logs.length > 5 ? '...' : ''}\n\n`;
    });

    return output;
  }

  async findBestMatch(query: string): Promise<{script: string, lasFile: string, tool: string, reasoning: string}> {
    const resources = await this.discoverResources();
    const resourceInfo = this.getResourcesForLLM();
    
    // Use keyword matching logic
    const queryLower = query.toLowerCase();
    
    // Check for specific script mentions
    for (const script of resources.scripts) {
      if (queryLower.includes(script.name.replace('.py', ''))) {
        const defaultLasFile = this.getDefaultLasForScript(script.name);
        return {
          script: script.name,
          lasFile: defaultLasFile,
          tool: script.tool,
          reasoning: `User specifically requested ${script.name}`
        };
      }
    }

    // Check for keyword matches
    for (const script of resources.scripts) {
      for (const keyword of script.suitableFor) {
        if (queryLower.includes(keyword.toLowerCase())) {
          const defaultLasFile = this.getDefaultLasForScript(script.name);
          return {
            script: script.name,
            lasFile: defaultLasFile,
            tool: script.tool,
            reasoning: `Query mentions "${keyword}" which matches ${script.name}`
          };
        }
      }
    }

    // Default fallback
    return {
      script: 'depth_visualization.py',
      lasFile: 'sample_well_01.las',
      tool: 'depth_plotter',
      reasoning: 'No specific match found, using default depth visualization'
    };
  }

  private getDefaultLasForScript(scriptName: string): string {
    const mapping: Record<string, string> = {
      'depth_visualization.py': 'sample_well_01.las',
      'gamma_ray_analyzer.py': 'production_well_02.las',
      'resistivity_analyzer.py': 'exploration_well_04.las',
      'porosity_calculator.py': 'offshore_well_03.las',
      'lithology_classifier.py': 'development_well_05.las'
    };
    return mapping[scriptName] || 'sample_well_01.las';
  }
}

export const mcpResourceService = new MCPResourceService();