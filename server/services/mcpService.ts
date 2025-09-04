import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export interface MCPResource {
  name: string;
  type: 'las_file' | 'script' | 'tool';
  path: string;
  size?: number;
  lastModified?: Date;
}

export interface MCPProcessingResult {
  success: boolean;
  outputPath?: string;
  processingTime: number;
  error?: string;
}

export class MCPService {
  private resourcesPath: string;
  private outputPath: string;
  private availableTools: string[];

  constructor() {
    this.resourcesPath = process.env.MCP_RESOURCES_PATH || './mcp_resources';
    this.outputPath = process.env.MCP_OUTPUT_PATH || './output';
    this.availableTools = [
      'depth_plotter',
      'gamma_analyzer', 
      'resistivity_tool',
      'porosity_calculator',
      'lithology_detector',
      'well_correlation',
      'log_quality_checker',
      'formation_evaluator'
    ];

    this.initializeDirectories();
  }

  private initializeDirectories(): void {
    // Create directories if they don't exist
    [this.resourcesPath, this.outputPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Create subdirectories
    const subdirs = ['las_files', 'scripts', 'tools'];
    subdirs.forEach(subdir => {
      const fullPath = path.join(this.resourcesPath, subdir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  async getResources(): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    try {
      // Get LAS files
      const lasFilesPath = path.join(this.resourcesPath, 'las_files');
      if (fs.existsSync(lasFilesPath)) {
        const lasFiles = fs.readdirSync(lasFilesPath);
        for (const file of lasFiles) {
          if (file.endsWith('.las')) {
            const filePath = path.join(lasFilesPath, file);
            const stats = fs.statSync(filePath);
            resources.push({
              name: file,
              type: 'las_file',
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }

      // Get scripts
      const scriptsPath = path.join(this.resourcesPath, 'scripts');
      if (fs.existsSync(scriptsPath)) {
        const scripts = fs.readdirSync(scriptsPath);
        for (const file of scripts) {
          if (file.endsWith('.py')) {
            const filePath = path.join(scriptsPath, file);
            const stats = fs.statSync(filePath);
            resources.push({
              name: file,
              type: 'script',
              path: filePath,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }

      // Add available tools
      this.availableTools.forEach(tool => {
        resources.push({
          name: tool,
          type: 'tool',
          path: `/mcp/tools/${tool}`,
        });
      });

    } catch (error) {
      console.error('Error getting MCP resources:', error);
    }

    return resources;
  }

  async processLASFile(
    lasFileName: string,
    scriptName: string,
    toolName: string
  ): Promise<MCPProcessingResult> {
    const startTime = Date.now();

    try {
      // Check if LAS file exists
      const lasFilePath = path.join(this.resourcesPath, 'las_files', lasFileName);
      if (!fs.existsSync(lasFilePath)) {
        return {
          success: false,
          processingTime: Date.now() - startTime,
          error: `LAS file not found: ${lasFileName}`,
        };
      }

      // Check if script exists
      const scriptPath = path.join(this.resourcesPath, 'scripts', scriptName);
      if (!fs.existsSync(scriptPath)) {
        return {
          success: false,
          processingTime: Date.now() - startTime,
          error: `Script not found: ${scriptName}`,
        };
      }

      // Check if tool is available
      if (!this.availableTools.includes(toolName)) {
        return {
          success: false,
          processingTime: Date.now() - startTime,
          error: `Tool not available: ${toolName}`,
        };
      }

      // Create timestamped output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5);
      const outputDir = path.join(this.outputPath, timestamp);
      fs.mkdirSync(outputDir, { recursive: true });

      // Generate output file path
      const outputFileName = `${path.basename(lasFileName, '.las')}_${toolName}_output.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      // Actually execute the Python script
      await this.executeScript(scriptPath, lasFilePath, outputFilePath);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        outputPath: outputFilePath,
        processingTime,
      };

    } catch (error) {
      return {
        success: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown processing error',
      };
    }
  }

  private async simulateProcessing(scriptName: string, toolName: string): Promise<void> {
    // Simulate processing time based on tool complexity
    const processingTimes: Record<string, number> = {
      'depth_plotter': 1000,
      'gamma_analyzer': 1500,
      'resistivity_tool': 2000,
      'porosity_calculator': 1200,
      'lithology_detector': 2500,
      'well_correlation': 3000,
      'log_quality_checker': 800,
      'formation_evaluator': 3500,
    };

    const delay = processingTimes[toolName] || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private async createPlaceholderPNG(outputPath: string): Promise<void> {
    // Create a minimal PNG file (1x1 pixel transparent)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x1F, 0x15, 0xC4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0xE2, 0x21, 0xBC, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);

    fs.writeFileSync(outputPath, pngData);
  }

  async getToolStatus(): Promise<{ available: number; total: number; tools: string[] }> {
    return {
      available: this.availableTools.length,
      total: this.availableTools.length,
      tools: [...this.availableTools],
    };
  }

  private async executeScript(scriptPath: string, lasFilePath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Executing script: ${scriptPath} with LAS file: ${lasFilePath}`);
      
      const pythonProcess = spawn('python3', [scriptPath, lasFilePath, outputPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`Python stdout: ${data.toString().trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`Python stderr: ${data.toString().trim()}`);
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`Script executed successfully: ${scriptPath}`);
          resolve();
        } else {
          console.error(`Script execution failed with code ${code}`);
          console.error(`Stderr: ${stderr}`);
          reject(new Error(`Script execution failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        console.error(`Failed to start Python process: ${error.message}`);
        reject(error);
      });
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test if we can access resources
      await this.getResources();
      return true;
    } catch (error) {
      console.error('MCP service test failed:', error);
      return false;
    }
  }
}
