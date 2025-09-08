import { type User, type InsertUser, type EmailLog, type InsertEmailLog, type SystemStatus, type InsertSystemStatus } from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Email log methods
  getEmailLogs(limit?: number): Promise<EmailLog[]>;
  getEmailLog(id: string): Promise<EmailLog | undefined>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined>;
  
  // System status methods
  getSystemStatus(): Promise<SystemStatus[]>;
  updateSystemStatus(component: string, status: InsertSystemStatus): Promise<SystemStatus>;
  
  // Configuration methods
  getLLMConfig(): Promise<{ provider: string; model: string; endpoint?: string; apiKey?: string } | undefined>;
  setLLMConfig(config: { provider: string; model: string; endpoint?: string; apiKey?: string }): Promise<void>;
}

interface JsonData {
  users: User[];
  emailLogs: EmailLog[];
  systemStatuses: SystemStatus[];
  llmConfig?: { provider: string; model: string; endpoint?: string; apiKey?: string };
}

export class JsonFileStorage implements IStorage {
  private dataFile: string;
  private data: JsonData;

  constructor(dataDir = "data") {
    this.dataFile = path.join(dataDir, "storage.json");
    this.data = {
      users: [],
      emailLogs: [],
      systemStatuses: [],
      llmConfig: undefined,
    };
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      
      // Try to read existing data
      const fileContent = await fs.readFile(this.dataFile, "utf-8");
      const parsedData = JSON.parse(fileContent, (key, value) => {
        // Convert ISO strings back to Date objects
        if (key === 'createdAt' || key === 'completedAt' || key === 'lastCheck') {
          return value ? new Date(value) : null;
        }
        return value;
      });
      this.data = parsedData;
    } catch (error) {
      // File doesn't exist or is invalid, initialize with defaults
      await this.initializeDefaults();
      await this.saveData();
    }
  }

  private async initializeDefaults(): Promise<void> {
    // Initialize default system statuses
    const defaultStatuses = [
      { component: 'email_monitor', status: 'offline' as const, metadata: { lastCheck: new Date().toISOString() } },
      { component: 'llm', status: 'offline' as const, metadata: { configured: false } },
      { component: 'mcp_server', status: 'online' as const, metadata: { initialized: true } },
    ];
    
    this.data.systemStatuses = defaultStatuses.map(status => ({
      id: randomUUID(),
      component: status.component,
      status: status.status,
      metadata: status.metadata,
      lastCheck: new Date(),
    }));
  }

  private async saveData(): Promise<void> {
    const jsonString = JSON.stringify(this.data, null, 2);
    await fs.writeFile(this.dataFile, jsonString, "utf-8");
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.data.users.push(user);
    await this.saveData();
    return user;
  }

  async getEmailLogs(limit = 50): Promise<EmailLog[]> {
    const logs = [...this.data.emailLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return logs;
  }

  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    return this.data.emailLogs.find(log => log.id === id);
  }

  async createEmailLog(insertLog: InsertEmailLog): Promise<EmailLog> {
    const id = randomUUID();
    const log: EmailLog = {
      ...insertLog,
      id,
      subject: insertLog.subject || null,
      llmResponse: insertLog.llmResponse || null,
      mcpScript: insertLog.mcpScript || null,
      lasFile: insertLog.lasFile || null,
      outputFile: insertLog.outputFile || null,
      errorMessage: insertLog.errorMessage || null,
      processingTime: insertLog.processingTime || null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.data.emailLogs.push(log);
    await this.saveData();
    return log;
  }

  async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined> {
    const index = this.data.emailLogs.findIndex(log => log.id === id);
    if (index === -1) return undefined;
    
    const updated: EmailLog = { ...this.data.emailLogs[index], ...updates };
    this.data.emailLogs[index] = updated;
    await this.saveData();
    return updated;
  }

  async getSystemStatus(): Promise<SystemStatus[]> {
    return [...this.data.systemStatuses];
  }

  async updateSystemStatus(component: string, status: InsertSystemStatus): Promise<SystemStatus> {
    const existingIndex = this.data.systemStatuses.findIndex(s => s.component === component);
    const id = existingIndex !== -1 ? this.data.systemStatuses[existingIndex].id : randomUUID();
    
    const updated: SystemStatus = {
      id,
      component,
      status: status.status,
      metadata: status.metadata || null,
      lastCheck: new Date(),
    };
    
    if (existingIndex !== -1) {
      this.data.systemStatuses[existingIndex] = updated;
    } else {
      this.data.systemStatuses.push(updated);
    }
    
    await this.saveData();
    return updated;
  }

  async getLLMConfig(): Promise<{ provider: string; model: string; endpoint?: string; apiKey?: string } | undefined> {
    return this.data.llmConfig;
  }

  async setLLMConfig(config: { provider: string; model: string; endpoint?: string; apiKey?: string }): Promise<void> {
    this.data.llmConfig = config;
    await this.saveData();
  }
}

export const storage = new JsonFileStorage();
