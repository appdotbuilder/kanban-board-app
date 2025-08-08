import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type GetTasksByStatusInput } from '../schema';
import { getTasks, getTasksByStatus } from '../handlers/get_tasks';

// Test data for creating tasks
const testTasks = [
  {
    title: 'Todo Task 1',
    description: 'First todo task',
    due_date: new Date('2024-12-31'),
    status: 'todo' as const
  },
  {
    title: 'In Progress Task',
    description: 'Task currently being worked on',
    due_date: null,
    status: 'in_progress' as const
  },
  {
    title: 'Done Task',
    description: 'Completed task',
    due_date: new Date('2024-01-15'),
    status: 'done' as const
  },
  {
    title: 'Todo Task 2',
    description: null,
    due_date: new Date('2024-06-15'),
    status: 'todo' as const
  }
];

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    
    expect(result).toEqual([]);
  });

  it('should return all tasks when no filter is provided', async () => {
    // Create test tasks
    await db.insert(tasksTable).values(testTasks).execute();

    const result = await getTasks();

    expect(result).toHaveLength(4);
    
    // Verify all tasks are returned
    const titles = result.map(task => task.title);
    expect(titles).toContain('Todo Task 1');
    expect(titles).toContain('In Progress Task');
    expect(titles).toContain('Done Task');
    expect(titles).toContain('Todo Task 2');

    // Verify proper field types
    result.forEach(task => {
      expect(task.id).toBeNumber();
      expect(task.title).toBeString();
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should filter tasks by status when filter is provided', async () => {
    // Create test tasks
    await db.insert(tasksTable).values(testTasks).execute();

    const input: GetTasksByStatusInput = { status: 'todo' };
    const result = await getTasks(input);

    expect(result).toHaveLength(2);
    
    // Verify only todo tasks are returned
    result.forEach(task => {
      expect(task.status).toBe('todo');
    });

    const titles = result.map(task => task.title);
    expect(titles).toContain('Todo Task 1');
    expect(titles).toContain('Todo Task 2');
  });

  it('should return tasks ordered by created_at', async () => {
    // Create tasks with different timestamps by inserting them separately
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'First Task',
        description: 'Created first',
        due_date: null,
        status: 'todo'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Second Task',
        description: 'Created second',
        due_date: null,
        status: 'todo'
      })
      .returning()
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(2);
    
    // Verify ordering by created_at (ascending)
    expect(result[0].title).toBe('First Task');
    expect(result[1].title).toBe('Second Task');
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
  });

  it('should handle nullable fields correctly', async () => {
    // Create a task with null description and due_date
    await db.insert(tasksTable)
      .values({
        title: 'Task with nulls',
        description: null,
        due_date: null,
        status: 'todo'
      })
      .execute();

    const result = await getTasks();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task with nulls');
    expect(result[0].description).toBeNull();
    expect(result[0].due_date).toBeNull();
    expect(result[0].status).toBe('todo');
  });
});

describe('getTasksByStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist for the status', async () => {
    const input: GetTasksByStatusInput = { status: 'done' };
    const result = await getTasksByStatus(input);
    
    expect(result).toEqual([]);
  });

  it('should filter tasks by specific status', async () => {
    // Create test tasks
    await db.insert(tasksTable).values(testTasks).execute();

    const input: GetTasksByStatusInput = { status: 'in_progress' };
    const result = await getTasksByStatus(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('In Progress Task');
    expect(result[0].status).toBe('in_progress');
    expect(result[0].description).toBe('Task currently being worked on');
  });

  it('should return all tasks when no status filter is provided', async () => {
    // Create test tasks
    await db.insert(tasksTable).values(testTasks).execute();

    const input: GetTasksByStatusInput = {};
    const result = await getTasksByStatus(input);

    expect(result).toHaveLength(4);
    
    // Verify all statuses are present
    const statuses = result.map(task => task.status);
    expect(statuses).toContain('todo');
    expect(statuses).toContain('in_progress');
    expect(statuses).toContain('done');
  });

  it('should return tasks for each status correctly', async () => {
    // Create test tasks
    await db.insert(tasksTable).values(testTasks).execute();

    // Test todo status
    const todoResult = await getTasksByStatus({ status: 'todo' });
    expect(todoResult).toHaveLength(2);
    todoResult.forEach(task => expect(task.status).toBe('todo'));

    // Test in_progress status
    const inProgressResult = await getTasksByStatus({ status: 'in_progress' });
    expect(inProgressResult).toHaveLength(1);
    expect(inProgressResult[0].status).toBe('in_progress');

    // Test done status
    const doneResult = await getTasksByStatus({ status: 'done' });
    expect(doneResult).toHaveLength(1);
    expect(doneResult[0].status).toBe('done');
  });

  it('should maintain created_at ordering', async () => {
    // Create multiple tasks with the same status
    const todoTask1 = await db.insert(tasksTable)
      .values({
        title: 'Todo 1',
        description: 'First todo',
        due_date: null,
        status: 'todo'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const todoTask2 = await db.insert(tasksTable)
      .values({
        title: 'Todo 2', 
        description: 'Second todo',
        due_date: null,
        status: 'todo'
      })
      .returning()
      .execute();

    const result = await getTasksByStatus({ status: 'todo' });

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Todo 1');
    expect(result[1].title).toBe('Todo 2');
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
  });

  it('should handle date fields properly', async () => {
    // Create task with specific due_date
    const specificDate = new Date('2024-12-25T10:00:00Z');
    await db.insert(tasksTable)
      .values({
        title: 'Christmas Task',
        description: 'Holiday task',
        due_date: specificDate,
        status: 'todo'
      })
      .execute();

    const result = await getTasksByStatus({ status: 'todo' });

    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});