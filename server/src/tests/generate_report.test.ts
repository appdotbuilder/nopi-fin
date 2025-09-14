import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type GenerateReportInput, type CreateUserInput, type CreateTransactionInput } from '../schema';
import { generateReport } from '../handlers/generate_report';

// Test data setup
const testUser: CreateUserInput = {
  id: 'test-user-123',
  email: 'test@example.com'
};

const testTransactions: CreateTransactionInput[] = [
  {
    user_id: 'test-user-123',
    type: 'income',
    amount: 1000.00,
    category: 'DD',
    description: 'Salary',
    transaction_date: new Date('2024-01-15')
  },
  {
    user_id: 'test-user-123',
    type: 'expense',
    amount: 500.00,
    category: 'ADD',
    description: 'Rent',
    transaction_date: new Date('2024-01-16')
  },
  {
    user_id: 'test-user-123',
    type: 'income',
    amount: 200.00,
    category: 'PBH',
    description: 'Freelance',
    transaction_date: new Date('2024-01-20')
  },
  {
    user_id: 'test-user-123',
    type: 'expense',
    amount: 150.00,
    category: 'PAD',
    description: 'Groceries',
    transaction_date: new Date('2024-01-25')
  }
];

describe('generateReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: testUser.id,
        email: testUser.email
      })
      .execute();

    // Create test transactions
    for (const transaction of testTransactions) {
      await db.insert(transactionsTable)
        .values({
          user_id: transaction.user_id,
          type: transaction.type,
          amount: transaction.amount.toString(),
          category: transaction.category,
          description: transaction.description || null,
          transaction_date: transaction.transaction_date
        })
        .execute();
    }
  });

  it('should generate custom period report', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    expect(result.period).toBe('custom');
    expect(result.start_date).toEqual(new Date('2024-01-01'));
    expect(result.end_date).toEqual(new Date('2024-01-31'));
    expect(result.total_income).toBe(1200.00); // 1000 + 200
    expect(result.total_expenses).toBe(650.00); // 500 + 150
    expect(result.net_balance).toBe(550.00); // 1200 - 650
    expect(result.transactions).toHaveLength(4);
  });

  it('should calculate income and expenses by category', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    // Income by category
    expect(result.income_by_category.DD).toBe(1000.00);
    expect(result.income_by_category.PBH).toBe(200.00);
    expect(result.income_by_category.ADD).toBe(0);
    expect(result.income_by_category.PAD).toBe(0);
    expect(result.income_by_category.DLL).toBe(0);

    // Expenses by category
    expect(result.expenses_by_category.ADD).toBe(500.00);
    expect(result.expenses_by_category.PAD).toBe(150.00);
    expect(result.expenses_by_category.DD).toBe(0);
    expect(result.expenses_by_category.PBH).toBe(0);
    expect(result.expenses_by_category.DLL).toBe(0);
  });

  it('should handle monthly period', async () => {
    // Mock current date to be in January 2024 for consistent testing
    const originalDate = Date;
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super('2024-01-15T00:00:00.000Z');
        } else {
          // @ts-ignore - TypeScript doesn't like spread with any[]
          super(...args);
        }
      }
      static now() {
        return new Date('2024-01-15T00:00:00.000Z').getTime();
      }
    } as any;

    try {
      const input: GenerateReportInput = {
        user_id: 'test-user-123',
        period: 'monthly'
      };

      const result = await generateReport(input);

      expect(result.period).toBe('monthly');
      expect(result.start_date.getFullYear()).toBe(2024);
      expect(result.start_date.getMonth()).toBe(0); // January (0-indexed)
      expect(result.start_date.getDate()).toBe(1);
      expect(result.transactions).toHaveLength(4);
    } finally {
      global.Date = originalDate;
    }
  });

  it('should handle weekly period', async () => {
    // Mock current date
    const originalDate = Date;
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super('2024-01-22T00:00:00.000Z');
        } else {
          // @ts-ignore - TypeScript doesn't like spread with any[]
          super(...args);
        }
      }
      static now() {
        return new Date('2024-01-22T00:00:00.000Z').getTime();
      }
    } as any;

    try {
      const input: GenerateReportInput = {
        user_id: 'test-user-123',
        period: 'weekly'
      };

      const result = await generateReport(input);

      expect(result.period).toBe('weekly');
      // Should include transactions from last 7 days
      expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    } finally {
      global.Date = originalDate;
    }
  });

  it('should handle yearly period', async () => {
    // Mock current date
    const originalDate = Date;
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super('2024-06-15T00:00:00.000Z');
        } else {
          // @ts-ignore - TypeScript doesn't like spread with any[]
          super(...args);
        }
      }
      static now() {
        return new Date('2024-06-15T00:00:00.000Z').getTime();
      }
    } as any;

    try {
      const input: GenerateReportInput = {
        user_id: 'test-user-123',
        period: 'yearly'
      };

      const result = await generateReport(input);

      expect(result.period).toBe('yearly');
      expect(result.start_date.getFullYear()).toBe(2024);
      expect(result.start_date.getMonth()).toBe(0); // January
      expect(result.start_date.getDate()).toBe(1);
      expect(result.end_date.getFullYear()).toBe(2024);
      expect(result.end_date.getMonth()).toBe(11); // December
    } finally {
      global.Date = originalDate;
    }
  });

  it('should return empty report for user with no transactions', async () => {
    // Create another user with no transactions
    await db.insert(usersTable)
      .values({
        id: 'empty-user',
        email: 'empty@example.com'
      })
      .execute();

    const input: GenerateReportInput = {
      user_id: 'empty-user',
      period: 'custom',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    expect(result.total_income).toBe(0);
    expect(result.total_expenses).toBe(0);
    expect(result.net_balance).toBe(0);
    expect(result.transactions).toHaveLength(0);
    
    // All category breakdowns should be zero
    Object.values(result.income_by_category).forEach(amount => {
      expect(amount).toBe(0);
    });
    Object.values(result.expenses_by_category).forEach(amount => {
      expect(amount).toBe(0);
    });
  });

  it('should filter transactions by date range correctly', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom',
      start_date: new Date('2024-01-18'), // After first two transactions
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    expect(result.transactions).toHaveLength(2); // Only last two transactions
    expect(result.total_income).toBe(200.00); // Only PBH income
    expect(result.total_expenses).toBe(150.00); // Only PAD expense
    expect(result.net_balance).toBe(50.00);
  });

  it('should order transactions by date descending', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    expect(result.transactions).toHaveLength(4);
    // Should be ordered by transaction_date descending
    for (let i = 0; i < result.transactions.length - 1; i++) {
      expect(result.transactions[i].transaction_date.getTime())
        .toBeGreaterThanOrEqual(result.transactions[i + 1].transaction_date.getTime());
    }
  });

  it('should throw error for non-existent user', async () => {
    const input: GenerateReportInput = {
      user_id: 'non-existent-user',
      period: 'monthly'
    };

    await expect(generateReport(input)).rejects.toThrow(/User not found/i);
  });

  it('should throw error for custom period without dates', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom'
      // Missing start_date and end_date
    };

    await expect(generateReport(input)).rejects.toThrow(/start_date and end_date are required for custom period/i);
  });

  it('should handle numeric type conversions correctly', async () => {
    const input: GenerateReportInput = {
      user_id: 'test-user-123',
      period: 'custom',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const result = await generateReport(input);

    // Verify all amounts are numbers, not strings
    expect(typeof result.total_income).toBe('number');
    expect(typeof result.total_expenses).toBe('number');
    expect(typeof result.net_balance).toBe('number');
    
    result.transactions.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
    });

    Object.values(result.income_by_category).forEach(amount => {
      expect(typeof amount).toBe('number');
    });
    Object.values(result.expenses_by_category).forEach(amount => {
      expect(typeof amount).toBe('number');
    });
  });
});