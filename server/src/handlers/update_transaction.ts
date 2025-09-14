import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // First, check if the transaction exists and belongs to the user
    const existingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, input.id))
      .execute();

    if (existingTransactions.length === 0) {
      throw new Error('Transaction not found');
    }

    const existingTransaction = existingTransactions[0];

    // Build the update object only with provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.type !== undefined) {
      updateData.type = input.type;
    }
    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString(); // Convert number to string for numeric column
    }
    if (input.category !== undefined) {
      updateData.category = input.category;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.transaction_date !== undefined) {
      updateData.transaction_date = input.transaction_date;
    }

    // Update the transaction
    const result = await db.update(transactionsTable)
      .set(updateData)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};