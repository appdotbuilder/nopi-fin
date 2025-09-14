import { db } from '../db';
import { notesTable } from '../db/schema';
import { type DeleteNoteInput } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteNote(input: DeleteNoteInput): Promise<{ success: boolean }> {
  try {
    // First, verify that the note exists and belongs to the user
    const existingNote = await db.select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.id, input.id),
          eq(notesTable.user_id, input.user_id)
        )
      )
      .execute();

    // If note doesn't exist or doesn't belong to the user, return false
    if (existingNote.length === 0) {
      return { success: false };
    }

    // Delete the note
    const result = await db.delete(notesTable)
      .where(
        and(
          eq(notesTable.id, input.id),
          eq(notesTable.user_id, input.user_id)
        )
      )
      .execute();

    // Check if deletion was successful by verifying rowCount
    return { success: result.rowCount !== null && result.rowCount > 0 };
  } catch (error) {
    console.error('Note deletion failed:', error);
    throw error;
  }
}