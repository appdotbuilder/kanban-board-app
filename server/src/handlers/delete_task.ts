import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deleteTask = async (input: DeleteTaskInput): Promise<{ success: boolean; id: number }> => {
  try {
    // First check if the task exists
    const existingTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .execute();

    if (existingTask.length === 0) {
      throw new Error(`Task with ID ${input.id} not found`);
    }

    // Delete the task
    const result = await db.delete(tasksTable)
      .where(eq(tasksTable.id, input.id))
      .returning({ id: tasksTable.id })
      .execute();

    // Verify deletion was successful
    if (result.length === 0) {
      throw new Error(`Failed to delete task with ID ${input.id}`);
    }

    return {
      success: true,
      id: result[0].id
    };
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
};