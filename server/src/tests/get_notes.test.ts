import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notesTable } from '../db/schema';
import { type GetUserNotesInput, type CreateUserInput, type CreateNoteInput } from '../schema';
import { getUserNotes } from '../handlers/get_notes';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  id: 'user-123',
  email: 'test@example.com'
};

const testUser2: CreateUserInput = {
  id: 'user-456',
  email: 'test2@example.com'
};

const testNote1: CreateNoteInput = {
  user_id: 'user-123',
  title: 'First Note',
  content: 'This is the first note content'
};

const testNote2: CreateNoteInput = {
  user_id: 'user-123',
  title: 'Second Note',
  content: 'This is the second note content'
};

const testNote3: CreateNoteInput = {
  user_id: 'user-456',
  title: 'Other User Note',
  content: 'This note belongs to a different user'
};

describe('getUserNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all notes for a user', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create test notes
    await db.insert(notesTable).values([
      {
        user_id: testNote1.user_id,
        title: testNote1.title,
        content: testNote1.content
      },
      {
        user_id: testNote2.user_id,
        title: testNote2.title,
        content: testNote2.content
      }
    ]).execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    
    // Check that both notes are returned
    const titles = result.map(note => note.title);
    expect(titles).toContain('First Note');
    expect(titles).toContain('Second Note');
    
    // Verify note structure
    result.forEach(note => {
      expect(note.id).toBeDefined();
      expect(note.user_id).toEqual(testUser.id);
      expect(note.title).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.created_at).toBeInstanceOf(Date);
      expect(note.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for user with no notes', async () => {
    // Create test user but no notes
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return notes for the specified user', async () => {
    // Create two users
    await db.insert(usersTable).values([
      { id: testUser.id, email: testUser.email },
      { id: testUser2.id, email: testUser2.email }
    ]).execute();

    // Create notes for both users
    await db.insert(notesTable).values([
      {
        user_id: testNote1.user_id,
        title: testNote1.title,
        content: testNote1.content
      },
      {
        user_id: testNote3.user_id,
        title: testNote3.title,
        content: testNote3.content
      }
    ]).execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('First Note');
    expect(result[0].user_id).toEqual(testUser.id);
  });

  it('should respect limit parameter', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create multiple test notes
    await db.insert(notesTable).values([
      {
        user_id: testNote1.user_id,
        title: testNote1.title,
        content: testNote1.content
      },
      {
        user_id: testNote2.user_id,
        title: testNote2.title,
        content: testNote2.content
      },
      {
        user_id: testUser.id,
        title: 'Third Note',
        content: 'Third note content'
      }
    ]).execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id,
      limit: 2
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
  });

  it('should respect offset parameter', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create test notes with specific order
    const insertedNotes = await db.insert(notesTable).values([
      {
        user_id: testUser.id,
        title: 'Note A',
        content: 'Content A'
      },
      {
        user_id: testUser.id,
        title: 'Note B',
        content: 'Content B'
      },
      {
        user_id: testUser.id,
        title: 'Note C',
        content: 'Content C'
      }
    ]).returning().execute();

    // Get all notes first to understand order
    const allNotes = await getUserNotes({ user_id: testUser.id });
    expect(allNotes).toHaveLength(3);

    // Test offset
    const inputWithOffset: GetUserNotesInput = {
      user_id: testUser.id,
      offset: 1
    };

    const result = await getUserNotes(inputWithOffset);

    expect(result).toHaveLength(2);
    // Should skip the first note (most recent due to desc order)
  });

  it('should combine limit and offset correctly', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create multiple notes
    await db.insert(notesTable).values([
      { user_id: testUser.id, title: 'Note 1', content: 'Content 1' },
      { user_id: testUser.id, title: 'Note 2', content: 'Content 2' },
      { user_id: testUser.id, title: 'Note 3', content: 'Content 3' },
      { user_id: testUser.id, title: 'Note 4', content: 'Content 4' },
      { user_id: testUser.id, title: 'Note 5', content: 'Content 5' }
    ]).execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id,
      limit: 2,
      offset: 2
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    // Should return notes at positions 3 and 4 (0-indexed after offset)
  });

  it('should order notes by created_at in descending order', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create notes with a small delay to ensure different timestamps
    const note1 = await db.insert(notesTable).values({
      user_id: testUser.id,
      title: 'Older Note',
      content: 'This was created first'
    }).returning().execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const note2 = await db.insert(notesTable).values({
      user_id: testUser.id,
      title: 'Newer Note',
      content: 'This was created second'
    }).returning().execute();

    const input: GetUserNotesInput = {
      user_id: testUser.id
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    // Most recent note should be first
    expect(result[0].title).toEqual('Newer Note');
    expect(result[1].title).toEqual('Older Note');
    
    // Verify timestamps
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle non-existent user gracefully', async () => {
    const input: GetUserNotesInput = {
      user_id: 'non-existent-user'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});