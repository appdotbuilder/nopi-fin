import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, usersTable } from '../db/schema';
import { type UpdateTransactionInput, type CreateUserInput, type CreateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test user
  const createTestUser = async (): Promise<string> => {
    const testUser: CreateUserInput = {
      id: 'test-user-123',
      email: 'test@example.com'
    };

    await db.insert(usersTable)
      .values({
        id: testUser.id,
        email: testUser.email
      })
      .execute();

    return testUser.id;
  };

  // Helper to create a test transaction
  const createTestTransaction = async (userId: string): Promise<number> => {
    const testTransaction: CreateTransactionInput = {
      user_id: userId,
      type: 'income',
      amount: 100.50,
      category: 'DD',
      description: 'Initial test transaction',
      transaction_date: new Date('2024-01-15')
    };

    const result = await db.insert(transactionsTable)
      .values({
        user_id: testTransaction.user_id,
        type: testTransaction.type,
        amount: testTransaction.amount.toString(),
        category: testTransaction.category,
        description: testTransaction.description,
        transaction_date: testTransaction.transaction_date
      })
      .returning()
      .execute();

    return result[0].id;
  };

  it('should update transaction type', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      type: 'expense'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.type).toEqual('expense');
    expect(result.user_id).toEqual(userId);
    expect(result.amount).toEqual(100.50); // Should remain unchanged
    expect(result.category).toEqual('DD'); // Should remain unchanged
    expect(result.description).toEqual('Initial test transaction'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction amount', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 250.75
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.amount).toEqual(250.75);
    expect(typeof result.amount).toBe('number');
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.category).toEqual('DD'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction category', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      category: 'PBH'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.category).toEqual('PBH');
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.amount).toEqual(100.50); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction description', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      description: 'Updated description'
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.description).toEqual('Updated description');
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.amount).toEqual(100.50); // Should remain unchanged
    expect(result.category).toEqual('DD'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction description to null', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      description: null
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.description).toBeNull();
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update transaction date', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const newDate = new Date('2024-02-20');
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      transaction_date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.transaction_date).toEqual(newDate);
    expect(result.type).toEqual('income'); // Should remain unchanged
    expect(result.amount).toEqual(100.50); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const newDate = new Date('2024-03-10');
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      type: 'expense',
      amount: 75.25,
      category: 'PAD',
      description: 'Multi-field update',
      transaction_date: newDate
    };

    const result = await updateTransaction(updateInput);

    expect(result.id).toEqual(transactionId);
    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(75.25);
    expect(typeof result.amount).toBe('number');
    expect(result.category).toEqual('PAD');
    expect(result.description).toEqual('Multi-field update');
    expect(result.transaction_date).toEqual(newDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 300.00,
      description: 'Database persistence test'
    };

    await updateTransaction(updateInput);

    // Verify the changes were persisted
    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    expect(savedTransactions).toHaveLength(1);
    const savedTransaction = savedTransactions[0];
    expect(parseFloat(savedTransaction.amount)).toEqual(300.00);
    expect(savedTransaction.description).toEqual('Database persistence test');
    expect(savedTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    // Get original updated_at timestamp
    const originalTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transactionId))
      .execute();

    const originalUpdatedAt = originalTransaction[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      amount: 150.00
    };

    const result = await updateTransaction(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when transaction does not exist', async () => {
    const updateInput: UpdateTransactionInput = {
      id: 99999, // Non-existent transaction ID
      amount: 100.00
    };

    expect(updateTransaction(updateInput)).rejects.toThrow(/transaction not found/i);
  });

  it('should handle partial updates without affecting other fields', async () => {
    const userId = await createTestUser();
    const transactionId = await createTestTransaction(userId);

    // Update only the type
    const updateInput: UpdateTransactionInput = {
      id: transactionId,
      type: 'expense'
    };

    const result = await updateTransaction(updateInput);

    // Verify only the type and updated_at changed
    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(100.50); // Original value
    expect(result.category).toEqual('DD'); // Original value
    expect(result.description).toEqual('Initial test transaction'); // Original value
    expect(result.transaction_date).toEqual(new Date('2024-01-15')); // Original value
  });
});