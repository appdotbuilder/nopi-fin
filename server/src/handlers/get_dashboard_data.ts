import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type DashboardData, type Transaction } from '../schema';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getDashboardData(userId: string): Promise<DashboardData> {
  try {
    // Get current date boundaries for monthly calculations
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get all transactions for the user to calculate totals
    const allTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    // Calculate total income and expenses
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    for (const transaction of allTransactions) {
      const amount = parseFloat(transaction.amount);
      const transactionDate = transaction.transaction_date;

      if (transaction.type === 'income') {
        totalIncome += amount;
        // Check if transaction is from current month
        if (transactionDate >= currentMonthStart && transactionDate < nextMonthStart) {
          monthlyIncome += amount;
        }
      } else if (transaction.type === 'expense') {
        totalExpenses += amount;
        // Check if transaction is from current month
        if (transactionDate >= currentMonthStart && transactionDate < nextMonthStart) {
          monthlyExpenses += amount;
        }
      }
    }

    // Calculate current balance (total income minus total expenses)
    // Round to 2 decimal places to avoid floating point precision issues
    const currentBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;

    // Get 5 most recent transactions
    const recentTransactionsRaw = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .orderBy(desc(transactionsTable.created_at))
      .limit(5)
      .execute();

    // Convert numeric fields for recent transactions
    const recentTransactions: Transaction[] = recentTransactionsRaw.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));

    return {
      current_balance: currentBalance,
      total_income: Math.round(totalIncome * 100) / 100,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      monthly_income: Math.round(monthlyIncome * 100) / 100,
      monthly_expenses: Math.round(monthlyExpenses * 100) / 100,
      recent_transactions: recentTransactions
    };
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}