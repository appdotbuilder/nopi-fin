import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { notesTable, usersTable } from '../db/schema';
import { type CreateNoteInput, type CreateUserInput } from '../schema';
import { createNote } from '../handlers/create_note';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  id: 'test-firebase-uid-123',
  email: 'testuser@example.com'
};

// Test note input
const testNoteInput: CreateNoteInput = {
  user_id: testUser.id,
  title: 'Test Note',
  content: 'This is a test note content with some details about financial planning.'
};

describe('createNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create a test user before each test
    await db.insert(usersTable)
      .values({
        id: testUser.id,
        email: testUser.email
      })
      .execute();
  });

  it('should create a note successfully', async () => {
    const result = await createNote(testNoteInput);

    // Verify returned note structure
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.title).toEqual('Test Note');
    expect(result.content).toEqual(testNoteInput.content);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save note to database', async () => {
    const result = await createNote(testNoteInput);

    // Query database to verify note was saved
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].user_id).toEqual(testUser.id);
    expect(notes[0].title).toEqual('Test Note');
    expect(notes[0].content).toEqual(testNoteInput.content);
    expect(notes[0].created_at).toBeInstanceOf(Date);
    expect(notes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create note with long content', async () => {
    const longContentInput: CreateNoteInput = {
      user_id: testUser.id,
      title: 'Long Content Note',
      content: 'This is a very long note content that contains multiple paragraphs and detailed information about financial planning, budget management, investment strategies, and various other topics that might be covered in a comprehensive financial note. '.repeat(10)
    };

    const result = await createNote(longContentInput);

    expect(result.content).toEqual(longContentInput.content);
    expect(result.content.length).toBeGreaterThan(1000);
  });

  it('should create note with minimal title', async () => {
    const minimalTitleInput: CreateNoteInput = {
      user_id: testUser.id,
      title: 'A',
      content: 'Short note content.'
    };

    const result = await createNote(minimalTitleInput);

    expect(result.title).toEqual('A');
    expect(result.content).toEqual('Short note content.');
  });

  it('should create multiple notes for same user', async () => {
    const firstNote: CreateNoteInput = {
      user_id: testUser.id,
      title: 'First Note',
      content: 'First note content.'
    };

    const secondNote: CreateNoteInput = {
      user_id: testUser.id,
      title: 'Second Note',
      content: 'Second note content.'
    };

    const result1 = await createNote(firstNote);
    const result2 = await createNote(secondNote);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(result2.user_id);
    expect(result1.title).toEqual('First Note');
    expect(result2.title).toEqual('Second Note');

    // Verify both notes exist in database
    const allNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.user_id, testUser.id))
      .execute();

    expect(allNotes).toHaveLength(2);
  });

  it('should throw error when user does not exist', async () => {
    const invalidUserInput: CreateNoteInput = {
      user_id: 'non-existent-user-id',
      title: 'Test Note',
      content: 'Test content'
    };

    await expect(createNote(invalidUserInput)).rejects.toThrow(/User with id non-existent-user-id not found/i);
  });

  it('should handle special characters in title and content', async () => {
    const specialCharsInput: CreateNoteInput = {
      user_id: testUser.id,
      title: 'Note with "Special" Characters & Symbols!',
      content: 'Content with émojis 🎉, unicode characters àáâãäå, and symbols: @#$%^&*()_+-=[]{}|;:,.<>?'
    };

    const result = await createNote(specialCharsInput);

    expect(result.title).toEqual(specialCharsInput.title);
    expect(result.content).toEqual(specialCharsInput.content);

    // Verify in database
    const savedNote = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(savedNote[0].title).toEqual(specialCharsInput.title);
    expect(savedNote[0].content).toEqual(specialCharsInput.content);
  });

  it('should handle empty content', async () => {
    const emptyContentInput: CreateNoteInput = {
      user_id: testUser.id,
      title: 'Empty Content Note',
      content: ''
    };

    const result = await createNote(emptyContentInput);

    expect(result.content).toEqual('');
    expect(result.title).toEqual('Empty Content Note');
  });
});