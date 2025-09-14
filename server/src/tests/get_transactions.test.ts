import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GetTransactionsByUserInput, type CreateUserInput } from '../schema';
import { getTransactionsByUser } from '../handlers/get_transactions';

// Test users
const testUser1: CreateUserInput = {
  id: 'user-1',
  email: 'user1@example.com'
};

const testUser2: CreateUserInput = {
  id: 'user-2',
  email: 'user2@example.com'
};

describe('getTransactionsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return transactions for a specific user', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    // Create test transactions for both users
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'income',
        amount: '1000.00',
        category: 'DD',
        description: 'Salary',
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '250.50',
        category: 'PBH',
        description: 'Groceries',
        transaction_date: new Date('2024-01-16')
      },
      {
        user_id: testUser2.id,
        type: 'income',
        amount: '500.00',
        category: 'ADD',
        description: 'Freelance',
        transaction_date: new Date('2024-01-17')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(2);
    expect(result.every(t => t.user_id === testUser1.id)).toBe(true);
    expect(result[0].amount).toBe(250.50); // Most recent first
    expect(result[1].amount).toBe(1000.00);
    expect(typeof result[0].amount).toBe('number');
  });

  it('should filter transactions by type', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create mixed transaction types
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'income',
        amount: '1000.00',
        category: 'DD',
        description: 'Salary',
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '250.50',
        category: 'PBH',
        description: 'Groceries',
        transaction_date: new Date('2024-01-16')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '100.00',
        category: 'PAD',
        description: 'Gas',
        transaction_date: new Date('2024-01-17')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      type: 'expense'
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(2);
    expect(result.every(t => t.type === 'expense')).toBe(true);
    expect(result[0].amount).toBe(100.00); // Most recent first
    expect(result[1].amount).toBe(250.50);
  });

  it('should filter transactions by category', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create transactions with different categories
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '150.00',
        category: 'PBH',
        description: 'Groceries 1',
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '200.00',
        category: 'PBH',
        description: 'Groceries 2',
        transaction_date: new Date('2024-01-16')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '75.00',
        category: 'PAD',
        description: 'Gas',
        transaction_date: new Date('2024-01-17')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      category: 'PBH'
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(2);
    expect(result.every(t => t.category === 'PBH')).toBe(true);
    expect(result[0].amount).toBe(200.00); // Most recent first
    expect(result[1].amount).toBe(150.00);
  });

  it('should filter by both type and category', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create various transactions
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'income',
        amount: '1000.00',
        category: 'DD',
        description: 'Salary',
        transaction_date: new Date('2024-01-15')
      },
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '250.00',
        category: 'PBH',
        description: 'Groceries',
        transaction_date: new Date('2024-01-16')
      },
      {
        user_id: testUser1.id,
        type: 'income',
        amount: '500.00',
        category: 'ADD',
        description: 'Side work',
        transaction_date: new Date('2024-01-17')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      type: 'income',
      category: 'ADD'
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('income');
    expect(result[0].category).toBe('ADD');
    expect(result[0].amount).toBe(500.00);
  });

  it('should apply pagination with limit', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create multiple transactions
    const transactions = Array.from({ length: 5 }, (_, i) => ({
      user_id: testUser1.id,
      type: 'expense' as const,
      amount: `${100 + i}.00`,
      category: 'PBH' as const,
      description: `Transaction ${i + 1}`,
      transaction_date: new Date(`2024-01-${15 + i}`)
    }));

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      limit: 3
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(3);
    // Should be ordered by date descending (most recent first)
    expect(result[0].amount).toBe(104.00); // Jan 19
    expect(result[1].amount).toBe(103.00); // Jan 18
    expect(result[2].amount).toBe(102.00); // Jan 17
  });

  it('should apply pagination with offset', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create multiple transactions
    const transactions = Array.from({ length: 5 }, (_, i) => ({
      user_id: testUser1.id,
      type: 'expense' as const,
      amount: `${100 + i}.00`,
      category: 'PBH' as const,
      description: `Transaction ${i + 1}`,
      transaction_date: new Date(`2024-01-${15 + i}`)
    }));

    await db.insert(transactionsTable).values(transactions).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      limit: 2,
      offset: 2
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(2);
    // Should skip first 2 and get next 2 (ordered by date descending)
    expect(result[0].amount).toBe(102.00); // Jan 17
    expect(result[1].amount).toBe(101.00); // Jan 16
  });

  it('should return empty array when user has no transactions', async () => {
    // Create test user but no transactions
    await db.insert(usersTable).values([testUser1]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array when no transactions match filters', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create transactions that won't match filter
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'expense',
        amount: '250.00',
        category: 'PBH',
        description: 'Groceries',
        transaction_date: new Date('2024-01-16')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id,
      type: 'income' // No income transactions exist
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle transactions with null descriptions', async () => {
    // Create test user
    await db.insert(usersTable).values([testUser1]).execute();

    // Create transaction with null description
    await db.insert(transactionsTable).values([
      {
        user_id: testUser1.id,
        type: 'income',
        amount: '1000.00',
        category: 'DD',
        description: null,
        transaction_date: new Date('2024-01-15')
      }
    ]).execute();

    const input: GetTransactionsByUserInput = {
      user_id: testUser1.id
    };

    const result = await getTransactionsByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(null);
    expect(result[0].amount).toBe(1000.00);
  });
});