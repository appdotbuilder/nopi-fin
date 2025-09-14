import { db } from '../db';
import { notesTable, usersTable } from '../db/schema';
import { type CreateNoteInput, type Note } from '../schema';
import { eq } from 'drizzle-orm';

export const createNote = async (input: CreateNoteInput): Promise<Note> => {
  try {
    // Validate that the user exists first
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Insert note record
    const result = await db.insert(notesTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        content: input.content
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Note creation failed:', error);
    throw error;
  }
};