import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { EmailService } from "./services/emailService";
import { LLMService } from "./services/llmService";
import { langchainLlmService } from "./services/langchainLlmService";
import { MCPService } from "./services/mcpService";
import { WebSocketServer } from 'ws';
import { insertEmailLogSchema } from "@shared/schema";

const emailService = new EmailService();
const llmService = new LLMService();
const mcpService = new MCPService();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket for real-time updates
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws' // Use a specific path to avoid conflicts with Vite's WebSocket
  });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast to all connected clients
  const broadcast = (data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(data));
      }
    });
  };

  // Dashboard data endpoint
  app.get("/api/dashboard", async (req, res) => {
    try {
      const [emailLogs, systemStatus] = await Promise.all([
        storage.getEmailLogs(10),
        storage.getSystemStatus(),
      ]);

      const stats = {
        processedToday: emailLogs.filter(log => {
          const today = new Date();
          const logDate = new Date(log.createdAt);
          return logDate.toDateString() === today.toDateString();
        }).length,
        totalProcessed: emailLogs.length,
        successRate: emailLogs.length > 0 
          ? (emailLogs.filter(log => log.status === 'completed').length / emailLogs.length) * 100 
          : 0,
      };

      res.json({
        systemStatus,
        emailLogs,
        stats,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Email logs endpoint
  app.get("/api/email-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getEmailLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // System status endpoint
  app.get("/api/system-status", async (req, res) => {
    try {
      const status = await storage.getSystemStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch system status" });
    }
  });

  // Manual trigger endpoint
  app.post("/api/trigger-manual", async (req, res) => {
    try {
      console.log('Manual trigger initiated');
      
      // Update system status to show processing
      await storage.updateSystemStatus('email_monitor', {
        component: 'email_monitor',
        status: 'warning',
        metadata: { manualTrigger: true, status: 'processing' },
      });

      // Broadcast status update
      broadcast({ type: 'status_update', component: 'email_monitor', status: 'processing' });

      // Process emails
      processEmails();

      res.json({ message: "Manual trigger initiated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to trigger manual process" });
    }
  });

  // Test connections endpoint
  app.post("/api/test-connections", async (req, res) => {
    try {
      // Extract LLM config from request if provided
      const { llmConfig } = req.body;
      
      const [emailTest, llmTest, mcpTest] = await Promise.all([
        emailService.testConnection(),
        llmService.testConnection(llmConfig),
        mcpService.testConnection(),
      ]);

      // Update system statuses
      await storage.updateSystemStatus('email_monitor', {
        component: 'email_monitor',
        status: emailTest ? 'online' : 'offline',
        metadata: { lastTest: new Date().toISOString() },
      });

      // Don't override configured status unless specifically testing
      const currentLlmStatus = await storage.getSystemStatus();
      const currentLlm = currentLlmStatus.find(s => s.component === 'llm');
      
      // Only update status if not configured, or if it was already offline
      const shouldUpdateStatus = !(currentLlm?.metadata as any)?.configured || currentLlm?.status === 'offline';
      
      if (shouldUpdateStatus) {
        await storage.updateSystemStatus('llm', {
          component: 'llm',
          status: llmTest.success ? 'online' : 'offline',
          metadata: { 
            ...(currentLlm?.metadata || {}),
            lastTest: new Date().toISOString(),
            responseTime: llmTest.responseTime,
            error: llmTest.error,
          },
        });
      } else {
        // Just update the test metadata, keep the existing status
        await storage.updateSystemStatus('llm', {
          component: 'llm',
          status: currentLlm?.status || 'offline',
          metadata: { 
            ...(currentLlm?.metadata || {}),
            lastTest: new Date().toISOString(),
            responseTime: llmTest.responseTime,
            error: llmTest.error,
          },
        });
      }

      await storage.updateSystemStatus('mcp_server', {
        component: 'mcp_server',
        status: mcpTest ? 'online' : 'offline',
        metadata: { lastTest: new Date().toISOString() },
      });

      res.json({
        email: emailTest,
        llm: llmTest,
        mcp: mcpTest,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to test connections" });
    }
  });

  // LLM configuration endpoint
  app.post("/api/llm-config", async (req, res) => {
    try {
      const { provider, model, endpoint, apiKey } = req.body;
      
      if (!provider || !model) {
        return res.status(400).json({ message: "Provider and model are required" });
      }

      // Update system status with new configuration
      // Note: Configuration is now stored in frontend localStorage, not backend
      await storage.updateSystemStatus('llm', {
        component: 'llm',
        status: 'offline', // Mark as offline initially (connection test will determine if online)
        metadata: {
          provider,
          model,
          endpoint: endpoint || null,
          hasApiKey: !!apiKey,
          lastConfigUpdate: new Date().toISOString(),
          configured: true,
          storageLocation: 'localStorage', // Indicate where config is stored
        },
      });

      console.log(`LLM configuration updated in localStorage: ${provider} - ${model}`);
      
      res.json({ 
        message: "LLM configuration saved to localStorage and system status updated",
        config: {
          provider,
          model,
          endpoint,
          hasApiKey: !!apiKey,
          storageLocation: 'localStorage'
        }
      });
    } catch (error) {
      console.error('Failed to update LLM system status:', error);
      res.status(500).json({ message: "Failed to update LLM system status" });
    }
  });

  // MCP resources endpoint
  app.get("/api/mcp-resources", async (req, res) => {
    try {
      const resources = await mcpService.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch MCP resources" });
    }
  });

  // Process direct query endpoint
  // Check clarification endpoint for conversational AI
  app.post("/api/check-clarification", async (req, res) => {
    try {
      const { query, llmConfig } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      // Simple keyword detection for greetings and common phrases
      const queryLower = query.toLowerCase().trim();
      const greetingKeywords = [
        'hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
        'how are you', 'what\'s up', 'thanks', 'thank you', 'goodbye', 'bye', 'see you',
        'ok', 'okay', 'yes', 'no', 'test', 'testing', 'ping', 'pong'
      ];

      // Check if query is just a greeting or simple response
      const isGreeting = greetingKeywords.some(keyword => 
        queryLower === keyword || queryLower.includes(keyword)
      );

      if (isGreeting || queryLower.length < 3) {
        return res.json({
          needsClarification: true,
          confidence: 0.9,
          suggestions: [],
          message: "Hello! I'm here to help with LAS file analysis. You can ask me to analyze gamma rays, resistivity, porosity, lithology, or create depth visualizations. What would you like to analyze?"
        });
      }

      // Check for analysis keywords to determine if this is a valid analysis request
      const analysisKeywords = [
        'gamma', 'ray', 'resistivity', 'porosity', 'lithology', 'depth', 'plot', 'analyze', 
        'analysis', 'visualization', 'calculate', 'las', 'well', 'log', 'formation', 'data'
      ];

      const hasAnalysisKeyword = analysisKeywords.some(keyword => 
        queryLower.includes(keyword)
      );

      // If no analysis keywords, ask for clarification
      if (!hasAnalysisKeyword) {
        return res.json({
          needsClarification: true,
          confidence: 0.3,
          suggestions: [
            "Depth visualization with sample_well_01.las", 
            "Gamma ray analysis with production_well_02.las",
            "Resistivity analysis with exploration_well_04.las",
            "Porosity calculation with offshore_well_03.las",
            "Lithology classification with development_well_05.las"
          ],
          message: "I'm not sure what type of analysis you need. Could you specify what you'd like to analyze?"
        });
      }

      // If we have analysis keywords, use LLM for more detailed processing
      const clarificationResult = await llmService.checkClarification(query, llmConfig);
      res.json(clarificationResult);
    } catch (error) {
      console.error('Clarification check error:', error);
      res.status(500).json({ 
        needsClarification: true,
        confidence: 0.1,
        suggestions: [
          "Gamma ray analysis with production_well_02.las",
          "Depth visualization with sample_well_01.las"
        ],
        message: "I'm having trouble understanding your request. Could you try rephrasing it?"
      });
    }
  });

  app.post("/api/process-query", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      console.log(`Processing direct query: ${query}`);
      
      // Create email log entry for the direct query
      const emailLog = await storage.createEmailLog({
        sender: "direct-query@system.local",
        subject: "Direct Query Processing",
        body: query,
        status: 'processing',
        llmResponse: null,
        mcpScript: null,
        lasFile: null,
        outputFile: null,
        errorMessage: null,
        processingTime: null,
        completedAt: null,
      });

      broadcast({ type: 'new_email', emailLog });

      try {
        // Extract LLM config from request if provided
        const { llmConfig } = req.body;
        
        // Analyze query with LLM
        console.log('Analyzing query with LLM...');
        const llmResponse = await llmService.analyzeEmailContent(query, llmConfig);
        
        await storage.updateEmailLog(emailLog.id, {
          llmResponse: llmResponse,
          mcpScript: llmResponse.script,
          lasFile: llmResponse.lasFile,
        });

        // Process with MCP
        console.log(`Processing LAS file: ${llmResponse.lasFile} with script: ${llmResponse.script}`);
        const mcpResult = await mcpService.processLASFile(
          llmResponse.lasFile,
          llmResponse.script,
          llmResponse.tool
        );

        if (mcpResult.success && mcpResult.outputPath) {
          await storage.updateEmailLog(emailLog.id, {
            status: 'completed',
            outputFile: mcpResult.outputPath,
            processingTime: mcpResult.processingTime,
            completedAt: new Date(),
          });

          console.log(`Direct query processed successfully`);
          
          const updatedLog = await storage.getEmailLog(emailLog.id);
          broadcast({ type: 'email_processed', emailLog: updatedLog });

          res.json({
            id: emailLog.id,
            query: query,
            llmResponse: llmResponse,
            outputFile: mcpResult.outputPath,
            status: 'completed',
            processingTime: mcpResult.processingTime,
          });
        } else {
          throw new Error(mcpResult.error || 'MCP processing failed');
        }

      } catch (processingError) {
        console.error('Direct query processing error:', processingError);
        
        await storage.updateEmailLog(emailLog.id, {
          status: 'error',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
          completedAt: new Date(),
        });

        const updatedLog = await storage.getEmailLog(emailLog.id);
        broadcast({ type: 'email_processed', emailLog: updatedLog });

        res.status(500).json({
          id: emailLog.id,
          query: query,
          llmResponse: null,
          status: 'error',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
        });
      }

    } catch (error) {
      res.status(500).json({ message: "Failed to process query" });
    }
  });

  // Langchain AI Agent endpoints
  app.post("/api/langchain/check-clarification", async (req, res) => {
    try {
      const { query, llmConfig } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      // Use LLM configuration from request body (frontend localStorage)
      // If not provided, fall back to system status (backward compatibility)
      let configToUse = llmConfig;
      if (!configToUse) {
        const systemStatus = await storage.getSystemStatus();
        const llmStatus = systemStatus.find(s => s.component === 'llm');
        configToUse = llmStatus?.metadata ? {
          provider: llmStatus.metadata.provider,
          model: llmStatus.metadata.model,
          endpoint: llmStatus.metadata.endpoint,
          apiKey: llmStatus.metadata.apiKey
        } : undefined;
      }

      const result = await langchainLlmService.checkClarification(query, configToUse);
      res.json(result);
      
    } catch (error) {
      console.error('Langchain clarification error:', error);
      res.status(500).json({
        needsClarification: true,
        confidence: 0.0,
        suggestions: ["Please try rephrasing your query"],
        message: "Langchain agent is currently unavailable",
        agentPlan: null
      });
    }
  });

  app.post("/api/langchain/process-query", async (req, res) => {
    try {
      const { query, llmConfig } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query is required" });
      }

      console.log(`Processing Langchain query: ${query}`);
      
      // Use LLM configuration from request body (frontend localStorage)
      // If not provided, fall back to system status (backward compatibility)
      let configToUse = llmConfig;
      if (!configToUse) {
        const systemStatus = await storage.getSystemStatus();
        const llmStatus = systemStatus.find(s => s.component === 'llm');
        configToUse = llmStatus?.metadata ? {
          provider: llmStatus.metadata.provider,
          model: llmStatus.metadata.model,
          endpoint: llmStatus.metadata.endpoint,
          apiKey: llmStatus.metadata.apiKey
        } : undefined;
      }
      
      // Create email log entry for the Langchain query
      const emailLog = await storage.createEmailLog({
        sender: "langchain-agent@system.local",
        subject: "Langchain AI Agent Processing",
        body: query,
        status: 'processing',
        llmResponse: null,
        mcpScript: null,
        lasFile: null,
        outputFile: null,
        errorMessage: null,
        processingTime: null,
        completedAt: null,
      });

      broadcast({ type: 'new_email', emailLog });

      try {
        console.log(`Analyzing query with Langchain agent...`);
        
        const langchainResult = await langchainLlmService.processQuery(query, configToUse);
        
        // Extract relevant information from Langchain agent response
        const finalResult = langchainResult.agentResponse?.finalResult;
        const toolsUsed = finalResult?.mcp_tools_used || [];
        const content = finalResult?.content || '';
        
        // Try to extract script/tool information from the response
        let scriptName = null;
        let toolName = null;
        let lasFileName = null;
        
        // Debug log to see what we're working with
        console.log('Query:', query);
        console.log('Full langchainResult:', JSON.stringify(langchainResult, null, 2));
        console.log('finalResult:', JSON.stringify(finalResult, null, 2));
        console.log('Content:', content.substring(0, 200) + '...');
        console.log('Tools used:', toolsUsed);
        
        // Look for depth plotter references - improved detection
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // Direct mapping from MCP tool names to actual scripts
        const toolMappings = {
          'create_depth_plot': { script: 'depth_visualization.py', tool: 'depth_plotter' },
          'analyze_depth_data': { script: 'depth_visualization.py', tool: 'depth_plotter' },
          'analyze_gamma_ray_formations': { script: 'gamma_ray_analyzer.py', tool: 'gamma_analyzer' },
          'calculate_formation_properties': { script: 'gamma_ray_analyzer.py', tool: 'gamma_analyzer' },
          'calculate_porosity': { script: 'porosity_calculator.py', tool: 'porosity_calculator' },
          'analyze_reservoir_quality': { script: 'porosity_calculator.py', tool: 'porosity_calculator' }
        };

        // Check if any of the tools used have direct mappings
        for (const tool of toolsUsed) {
          if (toolMappings[tool]) {
            scriptName = toolMappings[tool].script;
            toolName = toolMappings[tool].tool;
            console.log(`Detected MCP tool: ${tool} -> ${scriptName}`);
            break;
          }
        }

        // Fallback to text-based detection if no direct mapping found
        if (!scriptName) {
          if (queryLower.includes('depth') || contentLower.includes('depth')) {
            scriptName = 'depth_visualization.py';
            toolName = 'depth_plotter';
            console.log('Detected depth request via text analysis');
          }
          else if (queryLower.includes('gamma') || contentLower.includes('gamma')) {
            scriptName = 'gamma_ray_analyzer.py';
            toolName = 'gamma_analyzer';
            console.log('Detected gamma ray request via text analysis');
          }
          else if (queryLower.includes('porosity') || contentLower.includes('porosity')) {
            scriptName = 'porosity_calculator.py';
            toolName = 'porosity_calculator';
            console.log('Detected porosity request via text analysis');
          }
        }
        
        // Default to the first available LAS file if not specified
        const availableLasFiles = ['sample_well_01.las', 'production_well_02.las', 'offshore_well_03.las', 'exploration_well_04.las', 'development_well_05.las'];
        lasFileName = availableLasFiles[0]; // Use first available

        await storage.updateEmailLog(emailLog.id, {
          llmResponse: finalResult,
          mcpScript: scriptName,
          lasFile: lasFileName,
        });

        if (scriptName && toolName && lasFileName) {
          // Process with MCP using the extracted information
          console.log(`Processing LAS file via Langchain: ${lasFileName} with script: ${scriptName}`);
          const mcpResult = await mcpService.processLASFile(
            lasFileName,
            scriptName,
            toolName
          );

          if (mcpResult.success && mcpResult.outputPath) {
            await storage.updateEmailLog(emailLog.id, {
              status: 'completed',
              outputFile: mcpResult.outputPath,
              processingTime: mcpResult.processingTime,
              completedAt: new Date(),
            });

            console.log(`Langchain query processed successfully`);
            
            const updatedLog = await storage.getEmailLog(emailLog.id);
            broadcast({ type: 'email_processed', emailLog: updatedLog });

            res.json({
              id: emailLog.id,
              query: query,
              agentResponse: langchainResult.agentResponse,
              outputFile: mcpResult.outputPath,
              status: 'completed',
              processingTime: mcpResult.processingTime,
            });
          } else {
            throw new Error(mcpResult.error || 'MCP processing failed');
          }
        } else {
          throw new Error('Unable to determine appropriate script and tool from Langchain response');
        }

      } catch (processingError) {
        console.error('Langchain query processing error:', processingError);
        
        await storage.updateEmailLog(emailLog.id, {
          status: 'error',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
          completedAt: new Date(),
        });

        const updatedLog = await storage.getEmailLog(emailLog.id);
        broadcast({ type: 'email_processed', emailLog: updatedLog });

        res.status(500).json({
          id: emailLog.id,
          query: query,
          agentResponse: null,
          status: 'error',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
        });
      }

    } catch (error) {
      res.status(500).json({ message: "Failed to process Langchain query" });
    }
  });

  // Output files endpoints
  app.get("/api/output-files", async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const outputDir = path.resolve(process.cwd(), 'output');
      
      if (!fs.existsSync(outputDir)) {
        return res.json([]);
      }

      const folders = fs.readdirSync(outputDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort((a, b) => b.localeCompare(a)); // Sort newest first

      const result = [];

      for (const folderName of folders) {
        const folderPath = path.join(outputDir, folderName);
        const files = fs.readdirSync(folderPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .map(dirent => {
            const filePath = path.join(folderPath, dirent.name);
            const stats = fs.statSync(filePath);
            return {
              path: path.relative(process.cwd(), filePath),
              name: dirent.name,
              timestamp: stats.mtime.toISOString(),
              size: stats.size,
              isImage: /\.(png|jpg|jpeg|gif|bmp|svg)$/i.test(dirent.name),
            };
          })
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (files.length > 0) {
          const folderStats = fs.statSync(folderPath);
          result.push({
            name: folderName,
            files: files,
            createdAt: folderStats.birthtime.toISOString(),
          });
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Error fetching output files:', error);
      res.status(500).json({ message: "Failed to fetch output files" });
    }
  });

  app.get("/api/output-files/view", async (req, res) => {
    try {
      const { path: filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ message: "File path is required" });
      }

      const fs = await import('fs');
      const path = await import('path');
      
      const fullPath = path.resolve(process.cwd(), filePath);
      
      // Security check: ensure the file is within the output directory
      const outputDir = path.resolve(process.cwd(), 'output');
      if (!fullPath.startsWith(outputDir)) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "File not found" });
      }

      // Determine content type based on file extension
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypeMap: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
      };

      const contentType = contentTypeMap[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  app.get("/api/output-files/download", async (req, res) => {
    try {
      const { path: filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ message: "File path is required" });
      }

      const fs = await import('fs');
      const path = await import('path');
      
      const fullPath = path.resolve(process.cwd(), filePath);
      
      // Security check: ensure the file is within the output directory
      const outputDir = path.resolve(process.cwd(), 'output');
      if (!fullPath.startsWith(outputDir)) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "File not found" });
      }

      const fileName = path.basename(fullPath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Demo data endpoint for showcasing functionality
  app.post("/api/create-demo-data", async (req, res) => {
    try {
      // Create sample email logs for demonstration
      const sampleLogs = [
        {
          sender: "geologist@oilcompany.com",
          subject: "Analyze well data for sample_well_01.las",
          body: "Please analyze the gamma ray and resistivity data for sample_well_01.las file and generate depth visualization charts.",
          status: "completed" as const,
          llmResponse: {
            script: "depth_visualization.py",
            lasFile: "sample_well_01.las",
            tool: "depth_plotter",
            confidence: 0.95,
            reasoning: "Request specifically asks for depth analysis of sample_well_01.las file"
          },
          mcpScript: "depth_visualization.py",
          lasFile: "sample_well_01.las",
          outputFile: "./output/sample_well_01_depth_visualization.png",
          errorMessage: null,
          processingTime: 2500,
          completedAt: new Date(),
        },
        {
          sender: "petro.engineer@upstream.com",
          subject: "Gamma ray analysis needed",
          body: "I need statistical analysis of gamma ray data from production_well_02.las. Please generate histogram and moving average charts.",
          status: "completed" as const,
          llmResponse: {
            script: "gamma_ray_analyzer.py",
            lasFile: "production_well_02.las",
            tool: "gamma_analyzer",
            confidence: 0.88,
            reasoning: "Clear request for gamma ray statistical analysis"
          },
          mcpScript: "gamma_ray_analyzer.py",
          lasFile: "production_well_02.las",
          outputFile: "./output/production_well_02_gamma_analysis.png",
          errorMessage: null,
          processingTime: 3200,
          completedAt: new Date(),
        },
        {
          sender: "drilling@exploration.net",
          subject: "Process drilling logs",
          body: "Please process the latest drilling logs and provide formation evaluation.",
          status: "processing" as const,
          llmResponse: {
            script: "formation_evaluator.py",
            lasFile: "drilling_logs.las",
            tool: "formation_evaluator",
            confidence: 0.75,
            reasoning: "Formation evaluation requested for drilling logs"
          },
          mcpScript: "formation_evaluator.py",
          lasFile: "drilling_logs.las",
          outputFile: null,
          errorMessage: null,
          processingTime: null,
          completedAt: null,
        }
      ];

      const createdLogs = [];
      for (const logData of sampleLogs) {
        const log = await storage.createEmailLog(logData);
        createdLogs.push(log);
        broadcast({ type: 'new_email', emailLog: log });
      }

      res.json({ 
        message: "Demo data created successfully", 
        logsCreated: createdLogs.length,
        logs: createdLogs 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create demo data" });
    }
  });

  // Email processing function
  const processEmails = async () => {
    try {
      console.log('Checking for new emails...');
      const emails = await emailService.checkForNewEmails();
      
      for (const email of emails) {
        console.log(`Processing email from: ${email.from}`);
        
        // Create email log entry
        const emailLog = await storage.createEmailLog({
          sender: email.from,
          subject: email.subject,
          body: email.body,
          status: 'processing',
          llmResponse: null,
          mcpScript: null,
          lasFile: null,
          outputFile: null,
          errorMessage: null,
          processingTime: null,
          completedAt: null,
        });

        broadcast({ type: 'new_email', emailLog });

        try {
          // Analyze email with LLM
          console.log('Analyzing email with LLM...');
          const llmResponse = await llmService.analyzeEmailContent(email.body);
          
          await storage.updateEmailLog(emailLog.id, {
            llmResponse: llmResponse,
            mcpScript: llmResponse.script,
            lasFile: llmResponse.lasFile,
          });

          // Process with MCP
          console.log(`Processing LAS file: ${llmResponse.lasFile} with script: ${llmResponse.script}`);
          const mcpResult = await mcpService.processLASFile(
            llmResponse.lasFile,
            llmResponse.script,
            llmResponse.tool
          );

          if (mcpResult.success && mcpResult.outputPath) {
            // Send email with attachment
            await emailService.sendEmailWithAttachment(
              email.from,
              `Processing Results: ${email.subject}`,
              `Your LAS file analysis has been completed.\n\nProcessing details:\n- Script: ${llmResponse.script}\n- Tool: ${llmResponse.tool}\n- Processing time: ${mcpResult.processingTime}ms\n\nPlease find the generated visualization attached.`,
              mcpResult.outputPath
            );

            await storage.updateEmailLog(emailLog.id, {
              status: 'completed',
              outputFile: mcpResult.outputPath,
              processingTime: mcpResult.processingTime,
              completedAt: new Date(),
            });

            console.log(`Email processed successfully for ${email.from}`);
          } else {
            throw new Error(mcpResult.error || 'MCP processing failed');
          }

        } catch (processingError) {
          console.error('Email processing error:', processingError);
          
          await storage.updateEmailLog(emailLog.id, {
            status: 'error',
            errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error',
            completedAt: new Date(),
          });

          // Send error email
          await emailService.sendEmailWithAttachment(
            email.from,
            `Processing Error: ${email.subject}`,
            `There was an error processing your LAS file request.\n\nError details:\n${processingError instanceof Error ? processingError.message : 'Unknown error'}\n\nPlease check your request and try again.`
          );
        }

        broadcast({ type: 'email_processed', emailLog: await storage.getEmailLog(emailLog.id) });
      }

      // Update system status
      await storage.updateSystemStatus('email_monitor', {
        component: 'email_monitor',
        status: 'online',
        metadata: { 
          lastCheck: new Date().toISOString(),
          emailsProcessed: emails.length,
        },
      });

    } catch (error) {
      console.error('Email monitoring error:', error);
      
      await storage.updateSystemStatus('email_monitor', {
        component: 'email_monitor',
        status: 'offline',
        metadata: { 
          lastError: error instanceof Error ? error.message : 'Unknown error',
          lastCheck: new Date().toISOString(),
        },
      });
    }
  };

  // Start email monitoring
  const startEmailMonitoring = () => {
    const interval = parseInt(process.env.EMAIL_CHECK_INTERVAL || '60000'); // Default 1 minute
    setInterval(processEmails, interval);
    console.log(`Email monitoring started with ${interval}ms interval`);
  };

  // Initialize services
  setTimeout(() => {
    startEmailMonitoring();
  }, 5000); // Start monitoring after 5 seconds

  return httpServer;
}
