import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionsByUserInput, type Transaction } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export const getTransactionsByUser = async (input: GetTransactionsByUserInput): Promise<Transaction[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id (required parameter)
    conditions.push(eq(transactionsTable.user_id, input.user_id));

    // Add optional filters
    if (input.type !== undefined) {
      conditions.push(eq(transactionsTable.type, input.type));
    }

    if (input.category !== undefined) {
      conditions.push(eq(transactionsTable.category, input.category));
    }

    // Build the complete query at once to avoid type issues
    const baseQuery = db.select()
      .from(transactionsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(transactionsTable.transaction_date));

    // Apply pagination if provided
    const finalQuery = input.limit !== undefined && input.offset !== undefined
      ? baseQuery.limit(input.limit).offset(input.offset)
      : input.limit !== undefined
        ? baseQuery.limit(input.limit)
        : input.offset !== undefined
          ? baseQuery.offset(input.offset)
          : baseQuery;

    const results = await finalQuery.execute();

    // Convert numeric fields back to numbers
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount)
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
};