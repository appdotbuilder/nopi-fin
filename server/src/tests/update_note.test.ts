import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notesTable } from '../db/schema';
import { type UpdateNoteInput, type CreateUserInput, type CreateNoteInput } from '../schema';
import { updateNote } from '../handlers/update_note';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  id: 'test-user-123',
  email: 'test@example.com'
};

// Test note data
const testNote: CreateNoteInput = {
  user_id: 'test-user-123',
  title: 'Original Title',
  content: 'Original content for testing'
};

describe('updateNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a note title only', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    const updateInput: UpdateNoteInput = {
      id: createdNote.id,
      title: 'Updated Title'
    };

    const result = await updateNote(updateInput);

    expect(result.id).toEqual(createdNote.id);
    expect(result.user_id).toEqual(testNote.user_id);
    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('Original content for testing'); // Should remain unchanged
    expect(result.created_at).toEqual(createdNote.created_at);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });

  it('should update a note content only', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    const updateInput: UpdateNoteInput = {
      id: createdNote.id,
      content: 'Updated content with new information'
    };

    const result = await updateNote(updateInput);

    expect(result.id).toEqual(createdNote.id);
    expect(result.user_id).toEqual(testNote.user_id);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.content).toEqual('Updated content with new information');
    expect(result.created_at).toEqual(createdNote.created_at);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });

  it('should update both title and content', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    const updateInput: UpdateNoteInput = {
      id: createdNote.id,
      title: 'Completely New Title',
      content: 'Completely new content with different information'
    };

    const result = await updateNote(updateInput);

    expect(result.id).toEqual(createdNote.id);
    expect(result.user_id).toEqual(testNote.user_id);
    expect(result.title).toEqual('Completely New Title');
    expect(result.content).toEqual('Completely new content with different information');
    expect(result.created_at).toEqual(createdNote.created_at);
    expect(result.updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });

  it('should save updated note to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    const updateInput: UpdateNoteInput = {
      id: createdNote.id,
      title: 'Database Test Title',
      content: 'Database test content'
    };

    await updateNote(updateInput);

    // Verify the changes were persisted
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, createdNote.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toEqual('Database Test Title');
    expect(notes[0].content).toEqual('Database test content');
    expect(notes[0].updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });

  it('should throw error for non-existent note', async () => {
    const updateInput: UpdateNoteInput = {
      id: 99999, // Non-existent ID
      title: 'Should Fail'
    };

    await expect(updateNote(updateInput)).rejects.toThrow(/Note with id 99999 not found/i);
  });

  it('should handle empty string values correctly', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    const updateInput: UpdateNoteInput = {
      id: createdNote.id,
      title: '',
      content: ''
    };

    const result = await updateNote(updateInput);

    expect(result.title).toEqual('');
    expect(result.content).toEqual('');
    expect(result.updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });

  it('should only update updated_at timestamp even with no field changes', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create note to update
    const [createdNote] = await db.insert(notesTable).values({
      user_id: testNote.user_id,
      title: testNote.title,
      content: testNote.content
    }).returning().execute();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateNoteInput = {
      id: createdNote.id
      // No title or content provided
    };

    const result = await updateNote(updateInput);

    expect(result.title).toEqual(testNote.title); // Unchanged
    expect(result.content).toEqual(testNote.content); // Unchanged
    expect(result.updated_at.getTime()).toBeGreaterThan(createdNote.updated_at.getTime());
  });
});