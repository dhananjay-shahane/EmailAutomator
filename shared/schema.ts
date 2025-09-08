import { z } from "zod";

// Define schemas using Zod instead of Drizzle
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
});

export const emailLogSchema = z.object({
  id: z.string(),
  sender: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  status: z.enum(['received', 'processing', 'completed', 'error']),
  llmResponse: z.any().nullable(),
  mcpScript: z.string().nullable(),
  lasFile: z.string().nullable(),
  outputFile: z.string().nullable(),
  errorMessage: z.string().nullable(),
  processingTime: z.number().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export const systemStatusSchema = z.object({
  id: z.string(),
  component: z.string(),
  status: z.enum(['online', 'offline', 'warning']),
  lastCheck: z.date(),
  metadata: z.any().nullable(),
});

export const insertUserSchema = userSchema.pick({
  username: true,
  password: true,
});

export const insertEmailLogSchema = emailLogSchema.omit({
  id: true,
  createdAt: true,
});

export const insertSystemStatusSchema = systemStatusSchema.omit({
  id: true,
  lastCheck: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;
export type EmailLog = z.infer<typeof emailLogSchema>;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
