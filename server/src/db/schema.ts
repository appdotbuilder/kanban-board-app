import { serial, text, pgTable, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Define the task status enum
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done']);

// Tasks table definition
export const tasksTable = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default, matches Zod schema
  due_date: timestamp('due_date'), // Nullable by default for optional due dates
  status: taskStatusEnum('status').notNull().default('todo'), // Default to 'todo' status
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// TypeScript types for the table schema
export type Task = typeof tasksTable.$inferSelect; // For SELECT operations
export type NewTask = typeof tasksTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { tasks: tasksTable };