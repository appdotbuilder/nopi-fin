import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUser: CreateUserInput = {
  id: 'firebase-uid-123',
  email: 'test@example.com'
};

const testUser2: CreateUserInput = {
  id: 'firebase-uid-456',
  email: 'user2@example.com'
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user first
    await db.insert(usersTable)
      .values({
        id: testUser.id,
        email: testUser.email
      })
      .execute();

    const result = await getUser(testUser.id);

    // Verify the user data
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testUser.id);
    expect(result!.email).toEqual(testUser.email);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser('non-existent-user-id');

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    await db.insert(usersTable)
      .values([
        {
          id: testUser.id,
          email: testUser.email
        },
        {
          id: testUser2.id,
          email: testUser2.email
        }
      ])
      .execute();

    // Fetch the first user
    const result1 = await getUser(testUser.id);
    expect(result1).not.toBeNull();
    expect(result1!.id).toEqual(testUser.id);
    expect(result1!.email).toEqual(testUser.email);

    // Fetch the second user
    const result2 = await getUser(testUser2.id);
    expect(result2).not.toBeNull();
    expect(result2!.id).toEqual(testUser2.id);
    expect(result2!.email).toEqual(testUser2.email);

    // Verify they are different users
    expect(result1!.id).not.toEqual(result2!.id);
    expect(result1!.email).not.toEqual(result2!.email);
  });

  it('should handle empty string user ID', async () => {
    const result = await getUser('');

    expect(result).toBeNull();
  });

  it('should handle special characters in user ID', async () => {
    const specialUserId = 'firebase-uid-with-special@chars_123-456';
    
    // Create user with special characters in ID
    await db.insert(usersTable)
      .values({
        id: specialUserId,
        email: 'special@example.com'
      })
      .execute();

    const result = await getUser(specialUserId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(specialUserId);
    expect(result!.email).toEqual('special@example.com');
  });

  it('should verify database query only returns one user', async () => {
    // Create a user
    await db.insert(usersTable)
      .values({
        id: testUser.id,
        email: testUser.email
      })
      .execute();

    const result = await getUser(testUser.id);

    // Verify we got exactly one user, not an array
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(false);
    expect(typeof result).toBe('object');
    expect(result!.id).toEqual(testUser.id);
  });
});