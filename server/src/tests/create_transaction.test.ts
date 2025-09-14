import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com'
};

// Test transaction input
const testTransactionInput: CreateTransactionInput = {
  user_id: testUser.id,
  type: 'income' as const,
  amount: 1500.50,
  category: 'DD' as const,
  description: 'Salary payment',
  transaction_date: new Date('2024-01-15')
};

describe('createTransaction', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  afterEach(resetDB);

  it('should create a transaction with all fields', async () => {
    const result = await createTransaction(testTransactionInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.type).toEqual('income');
    expect(result.amount).toEqual(1500.50);
    expect(typeof result.amount).toEqual('number');
    expect(result.category).toEqual('DD');
    expect(result.description).toEqual('Salary payment');
    expect(result.transaction_date).toEqual(new Date('2024-01-15'));
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a transaction without optional description', async () => {
    const inputWithoutDescription: CreateTransactionInput = {
      user_id: testUser.id,
      type: 'expense' as const,
      amount: 75.25,
      category: 'PBH' as const,
      transaction_date: new Date('2024-01-16')
    };

    const result = await createTransaction(inputWithoutDescription);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.type).toEqual('expense');
    expect(result.amount).toEqual(75.25);
    expect(result.category).toEqual('PBH');
    expect(result.description).toBeNull();
    expect(result.transaction_date).toEqual(new Date('2024-01-16'));
  });

  it('should save transaction to database correctly', async () => {
    const result = await createTransaction(testTransactionInput);

    // Query the database to verify the transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    
    expect(savedTransaction.user_id).toEqual(testUser.id);
    expect(savedTransaction.type).toEqual('income');
    expect(parseFloat(savedTransaction.amount)).toEqual(1500.50);
    expect(savedTransaction.category).toEqual('DD');
    expect(savedTransaction.description).toEqual('Salary payment');
    expect(savedTransaction.transaction_date).toEqual(new Date('2024-01-15'));
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
    expect(savedTransaction.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different transaction categories', async () => {
    const categories = ['DD', 'ADD', 'PBH', 'PAD', 'DLL'] as const;
    
    for (const category of categories) {
      const input: CreateTransactionInput = {
        user_id: testUser.id,
        type: 'expense' as const,
        amount: 100.00,
        category: category,
        description: `Test for ${category}`,
        transaction_date: new Date('2024-01-17')
      };

      const result = await createTransaction(input);
      expect(result.category).toEqual(category);
    }
  });

  it('should handle both income and expense types', async () => {
    const incomeInput: CreateTransactionInput = {
      user_id: testUser.id,
      type: 'income' as const,
      amount: 2000.00,
      category: 'DD' as const,
      transaction_date: new Date('2024-01-18')
    };

    const expenseInput: CreateTransactionInput = {
      user_id: testUser.id,
      type: 'expense' as const,
      amount: 150.00,
      category: 'ADD' as const,
      transaction_date: new Date('2024-01-19')
    };

    const incomeResult = await createTransaction(incomeInput);
    const expenseResult = await createTransaction(expenseInput);

    expect(incomeResult.type).toEqual('income');
    expect(incomeResult.amount).toEqual(2000.00);
    expect(expenseResult.type).toEqual('expense');
    expect(expenseResult.amount).toEqual(150.00);
  });

  it('should handle decimal amounts correctly', async () => {
    const decimalAmounts = [99.99, 0.01, 1234.56, 999999.99];
    
    for (const amount of decimalAmounts) {
      const input: CreateTransactionInput = {
        user_id: testUser.id,
        type: 'income' as const,
        amount: amount,
        category: 'DD' as const,
        transaction_date: new Date('2024-01-20')
      };

      const result = await createTransaction(input);
      expect(result.amount).toEqual(amount);
      expect(typeof result.amount).toEqual('number');
    }
  });

  it('should throw error when user does not exist', async () => {
    const inputWithInvalidUser: CreateTransactionInput = {
      user_id: 'non-existent-user',
      type: 'income' as const,
      amount: 100.00,
      category: 'DD' as const,
      transaction_date: new Date('2024-01-21')
    };

    await expect(createTransaction(inputWithInvalidUser))
      .rejects.toThrow(/User with id non-existent-user not found/i);
  });

  it('should create multiple transactions for the same user', async () => {
    const transaction1: CreateTransactionInput = {
      user_id: testUser.id,
      type: 'income' as const,
      amount: 1000.00,
      category: 'DD' as const,
      description: 'First transaction',
      transaction_date: new Date('2024-01-22')
    };

    const transaction2: CreateTransactionInput = {
      user_id: testUser.id,
      type: 'expense' as const,
      amount: 250.00,
      category: 'ADD' as const,
      description: 'Second transaction',
      transaction_date: new Date('2024-01-23')
    };

    const result1 = await createTransaction(transaction1);
    const result2 = await createTransaction(transaction2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(testUser.id);
    expect(result2.user_id).toEqual(testUser.id);
    expect(result1.description).toEqual('First transaction');
    expect(result2.description).toEqual('Second transaction');
  });
});