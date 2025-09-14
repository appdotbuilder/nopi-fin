import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  id: 'firebase-uid-123',
  email: 'test@example.com'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.id).toEqual('firebase-uid-123');
    expect(result.email).toEqual('test@example.com');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].id).toEqual('firebase-uid-123');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle duplicate email error', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create another user with same email (should fail due to unique constraint)
    const duplicateInput: CreateUserInput = {
      id: 'firebase-uid-456',
      email: 'test@example.com'
    };

    expect(createUser(duplicateInput)).rejects.toThrow(/duplicate/i);
  });

  it('should handle duplicate ID error', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create another user with same Firebase UID (should fail due to primary key)
    const duplicateInput: CreateUserInput = {
      id: 'firebase-uid-123',
      email: 'another@example.com'
    };

    expect(createUser(duplicateInput)).rejects.toThrow();
  });

  it('should create multiple users with different credentials', async () => {
    const user1Input: CreateUserInput = {
      id: 'firebase-uid-123',
      email: 'user1@example.com'
    };

    const user2Input: CreateUserInput = {
      id: 'firebase-uid-456',
      email: 'user2@example.com'
    };

    // Create both users
    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    // Verify both users exist
    expect(user1.id).toEqual('firebase-uid-123');
    expect(user1.email).toEqual('user1@example.com');
    expect(user2.id).toEqual('firebase-uid-456');
    expect(user2.email).toEqual('user2@example.com');

    // Verify they're saved in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.email)).toContain('user1@example.com');
    expect(allUsers.map(u => u.email)).toContain('user2@example.com');
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createUser(testInput);
    const afterCreate = new Date();

    // Timestamps should be within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // created_at and updated_at should be very close (same transaction)
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});