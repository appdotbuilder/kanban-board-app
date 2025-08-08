import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type DeleteTaskInput, type CreateTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

// Test input for creating a task to delete
const testTaskInput: CreateTaskInput = {
  title: 'Test Task to Delete',
  description: 'A task created for deletion testing',
  due_date: new Date('2024-12-31'),
  status: 'todo'
};

// Helper function to create a test task
const createTestTask = async () => {
  const result = await db.insert(tasksTable)
    .values({
      title: testTaskInput.title,
      description: testTaskInput.description,
      due_date: testTaskInput.due_date,
      status: testTaskInput.status
    })
    .returning()
    .execute();
  return result[0];
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a test task first
    const createdTask = await createTestTask();
    
    const deleteInput: DeleteTaskInput = {
      id: createdTask.id
    };

    const result = await deleteTask(deleteInput);

    // Verify the response
    expect(result.success).toBe(true);
    expect(result.id).toEqual(createdTask.id);
  });

  it('should remove task from database', async () => {
    // Create a test task first
    const createdTask = await createTestTask();
    
    const deleteInput: DeleteTaskInput = {
      id: createdTask.id
    };

    await deleteTask(deleteInput);

    // Verify task is removed from database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should throw error when task does not exist', async () => {
    const nonExistentId = 99999;
    
    const deleteInput: DeleteTaskInput = {
      id: nonExistentId
    };

    await expect(deleteTask(deleteInput)).rejects.toThrow(/Task with ID 99999 not found/i);
  });

  it('should not affect other tasks when deleting one', async () => {
    // Create multiple test tasks
    const task1 = await createTestTask();
    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Another Task',
        description: 'Should not be deleted',
        due_date: new Date('2024-11-30'),
        status: 'in_progress'
      })
      .returning()
      .execute();

    const deleteInput: DeleteTaskInput = {
      id: task1.id
    };

    await deleteTask(deleteInput);

    // Verify first task is deleted
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1.id))
      .execute();

    expect(deletedTasks).toHaveLength(0);

    // Verify second task still exists
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2[0].id))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].title).toEqual('Another Task');
  });

  it('should handle different task statuses correctly', async () => {
    // Create tasks with different statuses
    const todoTask = await createTestTask();
    
    const inProgressTask = await db.insert(tasksTable)
      .values({
        title: 'In Progress Task',
        description: 'Task in progress',
        due_date: null,
        status: 'in_progress'
      })
      .returning()
      .execute();

    const doneTask = await db.insert(tasksTable)
      .values({
        title: 'Done Task',
        description: 'Completed task',
        due_date: new Date('2024-01-01'),
        status: 'done'
      })
      .returning()
      .execute();

    // Delete each task and verify success
    const tasks = [todoTask, inProgressTask[0], doneTask[0]];
    
    for (const task of tasks) {
      const deleteInput: DeleteTaskInput = {
        id: task.id
      };

      const result = await deleteTask(deleteInput);
      
      expect(result.success).toBe(true);
      expect(result.id).toEqual(task.id);

      // Verify task is actually deleted
      const checkTasks = await db.select()
        .from(tasksTable)
        .where(eq(tasksTable.id, task.id))
        .execute();

      expect(checkTasks).toHaveLength(0);
    }
  });

  it('should handle tasks with null description and due_date', async () => {
    // Create a task with null fields
    const taskWithNulls = await db.insert(tasksTable)
      .values({
        title: 'Minimal Task',
        description: null,
        due_date: null,
        status: 'todo'
      })
      .returning()
      .execute();

    const deleteInput: DeleteTaskInput = {
      id: taskWithNulls[0].id
    };

    const result = await deleteTask(deleteInput);

    expect(result.success).toBe(true);
    expect(result.id).toEqual(taskWithNulls[0].id);

    // Verify deletion
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskWithNulls[0].id))
      .execute();

    expect(tasks).toHaveLength(0);
  });
});