import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type DeleteTransactionInput } from '../schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const anotherUser = {
  id: 'another-user-id',
  email: 'another@example.com'
};

const testTransaction = {
  user_id: 'test-user-id',
  type: 'income' as const,
  amount: '100.00',
  category: 'DD' as const,
  description: 'Test transaction',
  transaction_date: new Date('2024-01-15')
};

const anotherUserTransaction = {
  user_id: 'another-user-id',
  type: 'expense' as const,
  amount: '50.00',
  category: 'ADD' as const,
  description: 'Another user transaction',
  transaction_date: new Date('2024-01-16')
};

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a transaction successfully', async () => {
    // Create test user and transaction
    await db.insert(usersTable).values(testUser);
    const [createdTransaction] = await db.insert(transactionsTable)
      .values(testTransaction)
      .returning();

    const input: DeleteTransactionInput = {
      id: createdTransaction.id,
      user_id: testUser.id
    };

    const result = await deleteTransaction(input);

    expect(result.success).toBe(true);

    // Verify transaction was actually deleted from database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, createdTransaction.id))
      .execute();

    expect(transactions).toHaveLength(0);
  });

  it('should throw error when transaction does not exist', async () => {
    // Create test user but no transaction
    await db.insert(usersTable).values(testUser);

    const input: DeleteTransactionInput = {
      id: 999, // Non-existent transaction ID
      user_id: testUser.id
    };

    expect(deleteTransaction(input)).rejects.toThrow(/transaction not found or access denied/i);
  });

  it('should throw error when user tries to delete another user\'s transaction', async () => {
    // Create both users
    await db.insert(usersTable).values([testUser, anotherUser]);

    // Create transaction for another user
    const [createdTransaction] = await db.insert(transactionsTable)
      .values(anotherUserTransaction)
      .returning();

    // Try to delete another user's transaction
    const input: DeleteTransactionInput = {
      id: createdTransaction.id,
      user_id: testUser.id // Different user trying to delete
    };

    expect(deleteTransaction(input)).rejects.toThrow(/transaction not found or access denied/i);

    // Verify transaction still exists in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, createdTransaction.id))
      .execute();

    expect(transactions).toHaveLength(1);
  });

  it('should only delete the specific transaction', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser);

    // Create multiple transactions for the same user
    const transaction1 = { ...testTransaction, description: 'Transaction 1' };
    const transaction2 = { ...testTransaction, description: 'Transaction 2' };
    const transaction3 = { ...testTransaction, description: 'Transaction 3' };

    const createdTransactions = await db.insert(transactionsTable)
      .values([transaction1, transaction2, transaction3])
      .returning();

    // Delete the middle transaction
    const input: DeleteTransactionInput = {
      id: createdTransactions[1].id,
      user_id: testUser.id
    };

    const result = await deleteTransaction(input);

    expect(result.success).toBe(true);

    // Verify only the specified transaction was deleted
    const remainingTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, testUser.id))
      .execute();

    expect(remainingTransactions).toHaveLength(2);
    expect(remainingTransactions.map(t => t.id)).not.toContain(createdTransactions[1].id);
    expect(remainingTransactions.map(t => t.id)).toContain(createdTransactions[0].id);
    expect(remainingTransactions.map(t => t.id)).toContain(createdTransactions[2].id);
  });

  it('should handle missing user correctly', async () => {
    // Create transaction without creating user (this shouldn't happen in practice due to FK constraints)
    // But test the handler's behavior if somehow a transaction exists without valid user

    const input: DeleteTransactionInput = {
      id: 999, // Non-existent transaction
      user_id: 'non-existent-user'
    };

    expect(deleteTransaction(input)).rejects.toThrow(/transaction not found or access denied/i);
  });

  it('should validate both transaction ID and user ID in single query', async () => {
    // Create test users and transactions
    await db.insert(usersTable).values([testUser, anotherUser]);
    
    const [userTransaction] = await db.insert(transactionsTable)
      .values(testTransaction)
      .returning();
    
    const [anotherTransaction] = await db.insert(transactionsTable)
      .values(anotherUserTransaction)
      .returning();

    // Try to delete another user's transaction with correct transaction ID but wrong user ID
    const input: DeleteTransactionInput = {
      id: anotherTransaction.id, // Valid transaction ID
      user_id: testUser.id // But wrong user
    };

    expect(deleteTransaction(input)).rejects.toThrow(/transaction not found or access denied/i);

    // Verify the transaction still exists
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, anotherTransaction.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toBe(anotherUser.id);
  });
});