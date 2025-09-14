import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { getDashboardData } from '../handlers/get_dashboard_data';
import type { CreateUserInput, CreateTransactionInput } from '../schema';

// Test data
const testUser: CreateUserInput = {
  id: 'test-user-123',
  email: 'test@example.com'
};

const testUser2: CreateUserInput = {
  id: 'test-user-456',
  email: 'test2@example.com'
};

describe('getDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty dashboard data for user with no transactions', async () => {
    // Create user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    });

    const result = await getDashboardData(testUser.id);

    expect(result.current_balance).toEqual(0);
    expect(result.total_income).toEqual(0);
    expect(result.total_expenses).toEqual(0);
    expect(result.monthly_income).toEqual(0);
    expect(result.monthly_expenses).toEqual(0);
    expect(result.recent_transactions).toHaveLength(0);
  });

  it('should calculate correct totals with mixed transactions', async () => {
    // Create user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    });

    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Create test transactions
    const transactions: CreateTransactionInput[] = [
      {
        user_id: testUser.id,
        type: 'income',
        amount: 1000.50,
        category: 'DD',
        description: 'Current month income',
        transaction_date: currentMonth
      },
      {
        user_id: testUser.id,
        type: 'expense',
        amount: 250.25,
        category: 'PBH',
        description: 'Current month expense',
        transaction_date: currentMonth
      },
      {
        user_id: testUser.id,
        type: 'income',
        amount: 500.00,
        category: 'ADD',
        description: 'Last month income',
        transaction_date: lastMonth
      },
      {
        user_id: testUser.id,
        type: 'expense',
        amount: 100.75,
        category: 'PAD',
        description: 'Last month expense',
        transaction_date: lastMonth
      }
    ];

    for (const transaction of transactions) {
      await db.insert(transactionsTable).values({
        user_id: transaction.user_id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        category: transaction.category,
        description: transaction.description,
        transaction_date: transaction.transaction_date
      });
    }

    const result = await getDashboardData(testUser.id);

    // Total calculations (all time)
    expect(result.total_income).toEqual(1500.50); // 1000.50 + 500.00
    expect(result.total_expenses).toEqual(351.00); // 250.25 + 100.75
    expect(result.current_balance).toEqual(1149.50); // 1500.50 - 351.00

    // Monthly calculations (current month only)
    expect(result.monthly_income).toEqual(1000.50);
    expect(result.monthly_expenses).toEqual(250.25);

    // Recent transactions should be ordered by created_at descending (most recently inserted first)
    expect(result.recent_transactions).toHaveLength(4);
    // The last transaction inserted was the last month expense (100.75)
    expect(result.recent_transactions[0].amount).toEqual(100.75);
    expect(result.recent_transactions[0].type).toEqual('expense');
    expect(typeof result.recent_transactions[0].amount).toBe('number');
  });

  it('should return only 5 most recent transactions when user has more', async () => {
    // Create user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    });

    // Create 7 transactions with different dates
    const baseDate = new Date();
    for (let i = 0; i < 7; i++) {
      const transactionDate = new Date(baseDate);
      transactionDate.setDate(baseDate.getDate() - i); // Each transaction 1 day earlier

      await db.insert(transactionsTable).values({
        user_id: testUser.id,
        type: 'income',
        amount: (100 + i).toString(),
        category: 'DD',
        description: `Transaction ${i}`,
        transaction_date: transactionDate
      });
    }

    const result = await getDashboardData(testUser.id);

    // Should return exactly 5 transactions
    expect(result.recent_transactions).toHaveLength(5);
    
    // Should be ordered by created_at descending (most recently inserted first)
    expect(result.recent_transactions[0].amount).toEqual(106); // Most recently inserted (i=6)
    expect(result.recent_transactions[4].amount).toEqual(102); // 5th most recently inserted (i=2)

    // Verify total calculations include all 7 transactions
    expect(result.total_income).toEqual(721); // 100+101+102+103+104+105+106
    expect(result.total_expenses).toEqual(0);
  });

  it('should only return data for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      { id: testUser.id, email: testUser.email },
      { id: testUser2.id, email: testUser2.email }
    ]);

    // Create transactions for both users
    await db.insert(transactionsTable).values([
      {
        user_id: testUser.id,
        type: 'income',
        amount: '1000.00',
        category: 'DD',
        transaction_date: new Date()
      },
      {
        user_id: testUser2.id,
        type: 'income',
        amount: '2000.00',
        category: 'ADD',
        transaction_date: new Date()
      }
    ]);

    const result = await getDashboardData(testUser.id);

    // Should only include data from testUser, not testUser2
    expect(result.total_income).toEqual(1000.00);
    expect(result.current_balance).toEqual(1000.00);
    expect(result.recent_transactions).toHaveLength(1);
    expect(result.recent_transactions[0].user_id).toEqual(testUser.id);
  });

  it('should correctly handle month boundary calculations', async () => {
    // Create user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    });

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfPreviousMonth = new Date(currentMonthStart.getTime() - 1);
    const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Create transactions around month boundaries
    await db.insert(transactionsTable).values([
      {
        user_id: testUser.id,
        type: 'income',
        amount: '500.00',
        category: 'DD',
        description: 'Previous month - should not count in monthly',
        transaction_date: lastDayOfPreviousMonth
      },
      {
        user_id: testUser.id,
        type: 'income',
        amount: '1000.00',
        category: 'ADD',
        description: 'Current month - should count in monthly',
        transaction_date: currentMonthStart
      },
      {
        user_id: testUser.id,
        type: 'expense',
        amount: '200.00',
        category: 'PBH',
        description: 'Current month expense',
        transaction_date: new Date() // Today (current month)
      }
    ]);

    const result = await getDashboardData(testUser.id);

    // Total calculations should include all transactions
    expect(result.total_income).toEqual(1500.00); // 500 + 1000
    expect(result.total_expenses).toEqual(200.00);
    expect(result.current_balance).toEqual(1300.00); // 1500 - 200

    // Monthly calculations should only include current month transactions
    expect(result.monthly_income).toEqual(1000.00); // Only current month income
    expect(result.monthly_expenses).toEqual(200.00); // Only current month expense
  });

  it('should handle decimal amounts correctly', async () => {
    // Create user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    });

    // Create transactions with various decimal amounts
    await db.insert(transactionsTable).values([
      {
        user_id: testUser.id,
        type: 'income',
        amount: '1234.56',
        category: 'DD',
        transaction_date: new Date()
      },
      {
        user_id: testUser.id,
        type: 'expense',
        amount: '789.12',
        category: 'PBH',
        transaction_date: new Date()
      },
      {
        user_id: testUser.id,
        type: 'expense',
        amount: '0.99',
        category: 'PAD',
        transaction_date: new Date()
      }
    ]);

    const result = await getDashboardData(testUser.id);

    expect(result.total_income).toEqual(1234.56);
    expect(result.total_expenses).toEqual(790.11); // 789.12 + 0.99
    expect(result.current_balance).toEqual(444.45); // 1234.56 - 790.11
    
    // Verify recent transactions have correct numeric types
    expect(typeof result.recent_transactions[0].amount).toBe('number');
    expect(result.recent_transactions.some(t => t.amount === 1234.56)).toBe(true);
    expect(result.recent_transactions.some(t => t.amount === 789.12)).toBe(true);
    expect(result.recent_transactions.some(t => t.amount === 0.99)).toBe(true);
  });
});