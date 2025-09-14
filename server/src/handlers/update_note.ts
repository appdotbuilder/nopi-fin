import { db } from '../db';
import { notesTable } from '../db/schema';
import { type UpdateNoteInput, type Note } from '../schema';
import { eq } from 'drizzle-orm';

export const updateNote = async (input: UpdateNoteInput): Promise<Note> => {
  try {
    // First verify the note exists
    const existingNote = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, input.id))
      .execute();

    if (existingNote.length === 0) {
      throw new Error(`Note with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof notesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    // Update the note
    const result = await db.update(notesTable)
      .set(updateData)
      .where(eq(notesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Note update failed:', error);
    throw error;
  }
};