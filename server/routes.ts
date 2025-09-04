import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { EmailService } from "./services/emailService";
import { LLMService } from "./services/llmService";
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
      const [emailTest, llmTest, mcpTest] = await Promise.all([
        emailService.testConnection(),
        llmService.testConnection(),
        mcpService.testConnection(),
      ]);

      // Update system statuses
      await storage.updateSystemStatus('email_monitor', {
        component: 'email_monitor',
        status: emailTest ? 'online' : 'offline',
        metadata: { lastTest: new Date().toISOString() },
      });

      await storage.updateSystemStatus('llm', {
        component: 'llm',
        status: llmTest.success ? 'online' : 'offline',
        metadata: { 
          lastTest: new Date().toISOString(),
          responseTime: llmTest.responseTime,
          error: llmTest.error,
        },
      });

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

  // MCP resources endpoint
  app.get("/api/mcp-resources", async (req, res) => {
    try {
      const resources = await mcpService.getResources();
      res.json(resources);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch MCP resources" });
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
          status: "completed",
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
          status: "completed",
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
          status: "processing",
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
