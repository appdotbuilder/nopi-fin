import { z } from 'zod';

// Enum for transaction categories
export const transactionCategoryEnum = z.enum(['DD', 'ADD', 'PBH', 'PAD', 'DLL']);
export type TransactionCategory = z.infer<typeof transactionCategoryEnum>;

// Enum for transaction types
export const transactionTypeEnum = z.enum(['income', 'expense']);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

// User schema
export const userSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.string(), // Foreign key to user
  type: transactionTypeEnum,
  amount: z.number().positive(),
  category: transactionCategoryEnum,
  description: z.string().nullable(), // Optional description
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Note schema
export const noteSchema = z.object({
  id: z.number(),
  user_id: z.string(), // Foreign key to user
  title: z.string(),
  content: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Note = z.infer<typeof noteSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createTransactionInputSchema = z.object({
  user_id: z.string(),
  type: transactionTypeEnum,
  amount: z.number().positive(),
  category: transactionCategoryEnum,
  description: z.string().nullable().optional(),
  transaction_date: z.coerce.date()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const createNoteInputSchema = z.object({
  user_id: z.string(),
  title: z.string().min(1),
  content: z.string()
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;

// Input schemas for updating entities
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  type: transactionTypeEnum.optional(),
  amount: z.number().positive().optional(),
  category: transactionCategoryEnum.optional(),
  description: z.string().nullable().optional(),
  transaction_date: z.coerce.date().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

export const updateNoteInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  content: z.string().optional()
});

export type UpdateNoteInput = z.infer<typeof updateNoteInputSchema>;

// Query schemas
export const getTransactionsByUserInputSchema = z.object({
  user_id: z.string(),
  type: transactionTypeEnum.optional(),
  category: transactionCategoryEnum.optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetTransactionsByUserInput = z.infer<typeof getTransactionsByUserInputSchema>;

export const getUserNotesInputSchema = z.object({
  user_id: z.string(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetUserNotesInput = z.infer<typeof getUserNotesInputSchema>;

// Financial report schemas
export const reportPeriodEnum = z.enum(['weekly', 'monthly', 'yearly', 'custom']);
export type ReportPeriod = z.infer<typeof reportPeriodEnum>;

export const generateReportInputSchema = z.object({
  user_id: z.string(),
  period: reportPeriodEnum,
  start_date: z.coerce.date().optional(), // Required for custom period
  end_date: z.coerce.date().optional() // Required for custom period
});

export type GenerateReportInput = z.infer<typeof generateReportInputSchema>;

// Dashboard data schema
export const dashboardDataSchema = z.object({
  current_balance: z.number(),
  total_income: z.number(),
  total_expenses: z.number(),
  monthly_income: z.number(),
  monthly_expenses: z.number(),
  recent_transactions: z.array(transactionSchema).max(5)
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;

// Financial report data schema
export const reportDataSchema = z.object({
  period: reportPeriodEnum,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  total_income: z.number(),
  total_expenses: z.number(),
  net_balance: z.number(),
  transactions: z.array(transactionSchema),
  income_by_category: z.record(transactionCategoryEnum, z.number()),
  expenses_by_category: z.record(transactionCategoryEnum, z.number())
});

export type ReportData = z.infer<typeof reportDataSchema>;

// Delete schemas
export const deleteTransactionInputSchema = z.object({
  id: z.number(),
  user_id: z.string() // Ensure user can only delete their own transactions
});

export type DeleteTransactionInput = z.infer<typeof deleteTransactionInputSchema>;

export const deleteNoteInputSchema = z.object({
  id: z.number(),
  user_id: z.string() // Ensure user can only delete their own notes
});

export type DeleteNoteInput = z.infer<typeof deleteNoteInputSchema>;