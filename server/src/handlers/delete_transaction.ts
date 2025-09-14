import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type DeleteTransactionInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTransaction(input: DeleteTransactionInput): Promise<{ success: boolean }> {
  try {
    // Verify the transaction exists and belongs to the user
    const existingTransaction = await db.select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, input.id),
          eq(transactionsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingTransaction.length === 0) {
      throw new Error('Transaction not found or access denied');
    }

    // Delete the transaction
    const result = await db.delete(transactionsTable)
      .where(
        and(
          eq(transactionsTable.id, input.id),
          eq(transactionsTable.user_id, input.user_id)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Transaction deletion failed:', error);
    throw error;
  }
}