import { type CreateUserInput, type User } from '../schema';

export async function createUser(input: CreateUserInput): Promise<User> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user (from Firebase Auth) and persisting their basic info in the database.
    // This will be called when a user first signs up via Firebase Authentication.
    return Promise.resolve({
        id: input.id,
        email: input.email,
        created_at: new Date(),
        updated_at: new Date()
    } as User);
}