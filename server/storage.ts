import { type User, type InsertUser, type EmailLog, type InsertEmailLog, type SystemStatus, type InsertSystemStatus } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private emailLogs: Map<string, EmailLog>;
  private systemStatuses: Map<string, SystemStatus>;

  constructor() {
    this.users = new Map();
    this.emailLogs = new Map();
    this.systemStatuses = new Map();
    
    // Initialize default system statuses
    const defaultStatuses = [
      { component: 'email_monitor', status: 'online' as const, metadata: { lastCheck: new Date().toISOString() } },
      { component: 'llm', status: 'online' as const, metadata: { model: 'llama3.2:1b', endpoint: 'https://88c46355da8c.ngrok-free.app/' } },
      { component: 'mcp_server', status: 'online' as const, metadata: { initialized: true } },
    ];
    
    defaultStatuses.forEach(status => {
      const id = randomUUID();
      this.systemStatuses.set(status.component, {
        id,
        ...status,
        lastCheck: new Date(),
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEmailLogs(limit = 50): Promise<EmailLog[]> {
    const logs = Array.from(this.emailLogs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return logs;
  }

  async getEmailLog(id: string): Promise<EmailLog | undefined> {
    return this.emailLogs.get(id);
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
    this.emailLogs.set(id, log);
    return log;
  }

  async updateEmailLog(id: string, updates: Partial<EmailLog>): Promise<EmailLog | undefined> {
    const existing = this.emailLogs.get(id);
    if (!existing) return undefined;
    
    const updated: EmailLog = { ...existing, ...updates };
    this.emailLogs.set(id, updated);
    return updated;
  }

  async getSystemStatus(): Promise<SystemStatus[]> {
    return Array.from(this.systemStatuses.values());
  }

  async updateSystemStatus(component: string, status: InsertSystemStatus): Promise<SystemStatus> {
    const existing = this.systemStatuses.get(component);
    const id = existing?.id || randomUUID();
    
    const updated: SystemStatus = {
      id,
      component,
      status: status.status,
      metadata: status.metadata || null,
      lastCheck: new Date(),
    };
    
    this.systemStatuses.set(component, updated);
    return updated;
  }
}

export const storage = new MemStorage();
