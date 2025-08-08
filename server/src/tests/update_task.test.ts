import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput, type CreateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

// Helper function to create a test task
const createTestTask = async (taskData: CreateTaskInput) => {
  const result = await db.insert(tasksTable)
    .values({
      title: taskData.title,
      description: taskData.description,
      due_date: taskData.due_date,
      status: taskData.status || 'todo'
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update task title', async () => {
    // Create test task
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description',
      due_date: null,
      status: 'todo'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Updated Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(testTask.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.status).toEqual('todo'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testTask.updated_at).toBe(true); // Should be more recent
  });

  it('should update task status', async () => {
    const testTask = await createTestTask({
      title: 'Test Task',
      description: null,
      due_date: null,
      status: 'todo'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      status: 'in_progress'
    };

    const result = await updateTask(updateInput);

    expect(result.status).toEqual('in_progress');
    expect(result.title).toEqual('Test Task'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description',
      due_date: null,
      status: 'todo'
    });

    const newDueDate = new Date('2024-12-31T23:59:59.000Z');
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'New Title',
      description: 'New description',
      due_date: newDueDate,
      status: 'done'
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.due_date).toEqual(newDueDate);
    expect(result.status).toEqual('done');
    expect(result.updated_at > testTask.updated_at).toBe(true);
  });

  it('should handle null values correctly', async () => {
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Has description',
      due_date: new Date(),
      status: 'todo'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      description: null,
      due_date: null
    };

    const result = await updateTask(updateInput);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Test Task'); // Should remain unchanged
  });

  it('should update task in database', async () => {
    const testTask = await createTestTask({
      title: 'Original Title',
      description: null,
      due_date: null,
      status: 'todo'
    });

    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Database Updated Title',
      status: 'done'
    };

    await updateTask(updateInput);

    // Verify the task was actually updated in the database
    const updatedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();

    expect(updatedTasks).toHaveLength(1);
    expect(updatedTasks[0].title).toEqual('Database Updated Title');
    expect(updatedTasks[0].status).toEqual('done');
    expect(updatedTasks[0].updated_at).toBeInstanceOf(Date);
    expect(updatedTasks[0].updated_at > testTask.updated_at).toBe(true);
  });

  it('should throw error for non-existent task', async () => {
    const updateInput: UpdateTaskInput = {
      id: 9999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/Task with ID 9999 not found/i);
  });

  it('should only update provided fields', async () => {
    const originalDueDate = new Date('2024-06-15T10:00:00.000Z');
    const testTask = await createTestTask({
      title: 'Original Title',
      description: 'Original description',
      due_date: originalDueDate,
      status: 'in_progress'
    });

    // Update only the title
    const updateInput: UpdateTaskInput = {
      id: testTask.id,
      title: 'Only Title Updated'
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('Only Title Updated');
    expect(result.description).toEqual('Original description');
    expect(result.due_date).toEqual(originalDueDate);
    expect(result.status).toEqual('in_progress');
  });

  it('should handle empty update gracefully', async () => {
    const testTask = await createTestTask({
      title: 'Test Task',
      description: 'Test description',
      due_date: null,
      status: 'todo'
    });

    // Update with only ID (no other fields)
    const updateInput: UpdateTaskInput = {
      id: testTask.id
    };

    const result = await updateTask(updateInput);

    // All original values should remain the same, except updated_at
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('Test description');
    expect(result.due_date).toBeNull();
    expect(result.status).toEqual('todo');
    expect(result.updated_at > testTask.updated_at).toBe(true); // Should still update timestamp
  });
});