import { z } from 'zod';

// Task status enum
export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

// Task schema with proper field handling
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(), // Can be explicitly null
  due_date: z.coerce.date().nullable(), // Can be explicitly null, converts string to Date
  status: taskStatusSchema,
  created_at: z.coerce.date(), // Automatically converts string timestamps to Date objects
  updated_at: z.coerce.date() // Automatically converts string timestamps to Date objects
});

export type Task = z.infer<typeof taskSchema>;

// Input schema for creating tasks
export const createTaskInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable(), // Explicit null allowed
  due_date: z.coerce.date().nullable(), // Can be null or a date
  status: taskStatusSchema.default('todo') // Default to 'todo' status
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schema for updating tasks
export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(), // Optional but if provided must be non-empty
  description: z.string().nullable().optional(), // Can be null, undefined, or a string
  due_date: z.coerce.date().nullable().optional(), // Can be null, undefined, or a date
  status: taskStatusSchema.optional() // Can be omitted or one of the valid statuses
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Input schema for deleting tasks
export const deleteTaskInputSchema = z.object({
  id: z.number()
});

export type DeleteTaskInput = z.infer<typeof deleteTaskInputSchema>;

// Input schema for getting tasks by status
export const getTasksByStatusInputSchema = z.object({
  status: taskStatusSchema.optional() // Optional filter by status
});

export type GetTasksByStatusInput = z.infer<typeof getTasksByStatusInputSchema>;