import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  deleteTransactionInputSchema,
  getTransactionsByUserInputSchema,
  createNoteInputSchema,
  updateNoteInputSchema,
  deleteNoteInputSchema,
  getUserNotesInputSchema,
  generateReportInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { createTransaction } from './handlers/create_transaction';
import { getTransactionsByUser } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { createNote } from './handlers/create_note';
import { getUserNotes } from './handlers/get_notes';
import { updateNote } from './handlers/update_note';
import { deleteNote } from './handlers/delete_note';
import { getDashboardData } from './handlers/get_dashboard_data';
import { generateReport } from './handlers/generate_report';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUser: publicProcedure
    .input(z.string())
    .query(({ input }) => getUser(input)),

  // Transaction management
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactionsByUser: publicProcedure
    .input(getTransactionsByUserInputSchema)
    .query(({ input }) => getTransactionsByUser(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(deleteTransactionInputSchema)
    .mutation(({ input }) => deleteTransaction(input)),

  // Note management
  createNote: publicProcedure
    .input(createNoteInputSchema)
    .mutation(({ input }) => createNote(input)),

  getUserNotes: publicProcedure
    .input(getUserNotesInputSchema)
    .query(({ input }) => getUserNotes(input)),

  updateNote: publicProcedure
    .input(updateNoteInputSchema)
    .mutation(({ input }) => updateNote(input)),

  deleteNote: publicProcedure
    .input(deleteNoteInputSchema)
    .mutation(({ input }) => deleteNote(input)),

  // Dashboard
  getDashboardData: publicProcedure
    .input(z.string()) // userId
    .query(({ input }) => getDashboardData(input)),

  // Financial reports
  generateReport: publicProcedure
    .input(generateReportInputSchema)
    .query(({ input }) => generateReport(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`NopiFin TRPC server listening at port: ${port}`);
}

start();