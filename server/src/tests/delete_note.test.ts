import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notesTable } from '../db/schema';
import { type DeleteNoteInput, type CreateUserInput, type CreateNoteInput } from '../schema';
import { deleteNote } from '../handlers/delete_note';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  id: 'test-user-123',
  email: 'testuser@example.com'
};

const otherUser: CreateUserInput = {
  id: 'other-user-456',
  email: 'otheruser@example.com'
};

const testNote: CreateNoteInput = {
  user_id: testUser.id,
  title: 'Test Note',
  content: 'This is a test note content'
};

const otherUserNote: CreateNoteInput = {
  user_id: otherUser.id,
  title: 'Other User Note',
  content: 'This note belongs to another user'
};

describe('deleteNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a note that exists and belongs to the user', async () => {
    // Create test user and note
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    const noteResults = await db.insert(notesTable)
      .values({
        user_id: testNote.user_id,
        title: testNote.title,
        content: testNote.content
      })
      .returning()
      .execute();

    const createdNote = noteResults[0];

    const deleteInput: DeleteNoteInput = {
      id: createdNote.id,
      user_id: testUser.id
    };

    // Delete the note
    const result = await deleteNote(deleteInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify note no longer exists in database
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, createdNote.id))
      .execute();

    expect(remainingNotes).toHaveLength(0);
  });

  it('should return false when note does not exist', async () => {
    // Create test user but no note
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    const deleteInput: DeleteNoteInput = {
      id: 999, // Non-existent note ID
      user_id: testUser.id
    };

    const result = await deleteNote(deleteInput);

    // Should return false for non-existent note
    expect(result.success).toBe(false);
  });

  it('should return false when trying to delete another user\'s note', async () => {
    // Create both test users
    await db.insert(usersTable).values([
      {
        id: testUser.id,
        email: testUser.email
      },
      {
        id: otherUser.id,
        email: otherUser.email
      }
    ]).execute();

    // Create note belonging to other user
    const noteResults = await db.insert(notesTable)
      .values({
        user_id: otherUserNote.user_id,
        title: otherUserNote.title,
        content: otherUserNote.content
      })
      .returning()
      .execute();

    const createdNote = noteResults[0];

    const deleteInput: DeleteNoteInput = {
      id: createdNote.id,
      user_id: testUser.id // Wrong user trying to delete
    };

    const result = await deleteNote(deleteInput);

    // Should return false when trying to delete another user's note
    expect(result.success).toBe(false);

    // Verify note still exists in database
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, createdNote.id))
      .execute();

    expect(remainingNotes).toHaveLength(1);
    expect(remainingNotes[0].user_id).toEqual(otherUser.id);
  });

  it('should only delete the specified note and leave others intact', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: testUser.id,
      email: testUser.email
    }).execute();

    // Create multiple notes for the same user
    const noteResults = await db.insert(notesTable)
      .values([
        {
          user_id: testUser.id,
          title: 'First Note',
          content: 'First note content'
        },
        {
          user_id: testUser.id,
          title: 'Second Note',
          content: 'Second note content'
        },
        {
          user_id: testUser.id,
          title: 'Third Note',
          content: 'Third note content'
        }
      ])
      .returning()
      .execute();

    const noteToDelete = noteResults[1]; // Delete the second note

    const deleteInput: DeleteNoteInput = {
      id: noteToDelete.id,
      user_id: testUser.id
    };

    const result = await deleteNote(deleteInput);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify only the specified note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.user_id, testUser.id))
      .execute();

    expect(remainingNotes).toHaveLength(2);

    // Verify the deleted note is not in the results
    const deletedNoteExists = remainingNotes.some(note => note.id === noteToDelete.id);
    expect(deletedNoteExists).toBe(false);

    // Verify the other notes still exist
    const remainingTitles = remainingNotes.map(note => note.title).sort();
    expect(remainingTitles).toEqual(['First Note', 'Third Note']);
  });

  it('should handle deletion when user_id is wrong but note exists', async () => {
    // Create both users
    await db.insert(usersTable).values([
      {
        id: testUser.id,
        email: testUser.email
      },
      {
        id: otherUser.id,
        email: otherUser.email
      }
    ]).execute();

    // Create note for test user
    const noteResults = await db.insert(notesTable)
      .values({
        user_id: testUser.id,
        title: testNote.title,
        content: testNote.content
      })
      .returning()
      .execute();

    const createdNote = noteResults[0];

    const deleteInput: DeleteNoteInput = {
      id: createdNote.id,
      user_id: otherUser.id // Wrong user
    };

    const result = await deleteNote(deleteInput);

    // Should return false
    expect(result.success).toBe(false);

    // Verify note still exists and belongs to original user
    const existingNote = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, createdNote.id))
      .execute();

    expect(existingNote).toHaveLength(1);
    expect(existingNote[0].user_id).toEqual(testUser.id);
    expect(existingNote[0].title).toEqual(testNote.title);
  });
});