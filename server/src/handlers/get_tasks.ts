import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type Task, type GetTasksByStatusInput } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getTasks = async (input?: GetTasksByStatusInput): Promise<Task[]> => {
  try {
    // Build query with conditional where clause
    const baseQuery = db.select().from(tasksTable);
    
    const query = input?.status 
      ? baseQuery.where(eq(tasksTable.status, input.status)).orderBy(asc(tasksTable.created_at))
      : baseQuery.orderBy(asc(tasksTable.created_at));

    const results = await query.execute();

    // Return results - timestamps are already Date objects from drizzle
    return results;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
};

export const getTasksByStatus = async (input: GetTasksByStatusInput): Promise<Task[]> => {
  try {
    // Build query with conditional where clause
    const baseQuery = db.select().from(tasksTable);
    
    const query = input.status 
      ? baseQuery.where(eq(tasksTable.status, input.status)).orderBy(asc(tasksTable.created_at))
      : baseQuery.orderBy(asc(tasksTable.created_at));

    const results = await query.execute();

    // Return results - timestamps are already Date objects from drizzle
    return results;
  } catch (error) {
    console.error('Failed to fetch tasks by status:', error);
    throw error;
  }
};