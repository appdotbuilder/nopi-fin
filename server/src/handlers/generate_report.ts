import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type GenerateReportInput, type ReportData, type Transaction, type TransactionCategory } from '../schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function generateReport(input: GenerateReportInput): Promise<ReportData> {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User not found: ${input.user_id}`);
    }

    // Calculate date range based on period
    const { start_date, end_date } = calculateDateRange(input);

    // Build query conditions
    const conditions: SQL<unknown>[] = [
      eq(transactionsTable.user_id, input.user_id),
      gte(transactionsTable.transaction_date, start_date),
      lte(transactionsTable.transaction_date, end_date)
    ];

    // Query transactions for the period
    const results = await db.select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric fields and type the transactions
    const transactions: Transaction[] = results.map(result => ({
      ...result,
      amount: parseFloat(result.amount)
    }));

    // Calculate totals and breakdowns
    let total_income = 0;
    let total_expenses = 0;
    const income_by_category: Record<TransactionCategory, number> = {
      'DD': 0, 'ADD': 0, 'PBH': 0, 'PAD': 0, 'DLL': 0
    };
    const expenses_by_category: Record<TransactionCategory, number> = {
      'DD': 0, 'ADD': 0, 'PBH': 0, 'PAD': 0, 'DLL': 0
    };

    // Process each transaction
    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        total_income += transaction.amount;
        income_by_category[transaction.category] += transaction.amount;
      } else {
        total_expenses += transaction.amount;
        expenses_by_category[transaction.category] += transaction.amount;
      }
    }

    const net_balance = total_income - total_expenses;

    return {
      period: input.period,
      start_date,
      end_date,
      total_income,
      total_expenses,
      net_balance,
      transactions,
      income_by_category,
      expenses_by_category
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
}

function calculateDateRange(input: GenerateReportInput): { start_date: Date; end_date: Date } {
  const now = new Date();
  
  if (input.period === 'custom') {
    if (!input.start_date || !input.end_date) {
      throw new Error('start_date and end_date are required for custom period');
    }
    return {
      start_date: input.start_date,
      end_date: input.end_date
    };
  }

  let start_date: Date;
  let end_date = new Date(now); // End of today

  switch (input.period) {
    case 'weekly':
      start_date = new Date(now);
      start_date.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start_date = new Date(now.getFullYear(), now.getMonth(), 1);
      end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'yearly':
      start_date = new Date(now.getFullYear(), 0, 1);
      end_date = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      throw new Error(`Unsupported period: ${input.period}`);
  }

  return { start_date, end_date };
}