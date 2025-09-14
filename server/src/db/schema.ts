import { serial, text, pgTable, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const transactionCategoryEnum = pgEnum('transaction_category', ['DD', 'ADD', 'PBH', 'PAD', 'DLL']);
export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull().unique(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: transactionCategoryEnum('category').notNull(),
  description: text('description'), // Nullable by default
  transaction_date: timestamp('transaction_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notes table
export const notesTable = pgTable('notes', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable),
  notes: many(notesTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const notesRelations = relations(notesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
export type Note = typeof notesTable.$inferSelect;
export type NewNote = typeof notesTable.$inferInsert;

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  transactions: transactionsTable, 
  notes: notesTable 
};

export const tableRelations = {
  usersRelations,
  transactionsRelations,
  notesRelations
};