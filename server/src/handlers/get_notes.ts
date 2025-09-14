import { db } from '../db';
import { notesTable } from '../db/schema';
import { type GetUserNotesInput, type Note } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserNotes(input: GetUserNotesInput): Promise<Note[]> {
  try {
    // Build query with all parameters applied at once to avoid TypeScript issues
    const limit = input.limit || 1000; // Default high limit if not specified
    const offset = input.offset || 0; // Default to 0 if not specified

    const results = await db.select()
      .from(notesTable)
      .where(eq(notesTable.user_id, input.user_id))
      .orderBy(desc(notesTable.created_at))
      .limit(limit)
      .offset(offset)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user notes:', error);
    throw error;
  }
}