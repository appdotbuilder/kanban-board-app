import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs with various scenarios
const basicTaskInput: CreateTaskInput = {
  title: 'Complete project documentation',
  description: 'Write comprehensive documentation for the task management system',
  due_date: new Date('2024-12-31'),
  status: 'todo'
};

const minimalTaskInput: CreateTaskInput = {
  title: 'Quick task',
  description: null,
  due_date: null,
  status: 'todo'
};

const inProgressTaskInput: CreateTaskInput = {
  title: 'Review code changes',
  description: 'Review and approve pending pull requests',
  due_date: new Date('2024-01-15'),
  status: 'in_progress'
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(basicTaskInput);

    // Basic field validation
    expect(result.title).toEqual('Complete project documentation');
    expect(result.description).toEqual('Write comprehensive documentation for the task management system');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date?.getTime()).toEqual(new Date('2024-12-31').getTime());
    expect(result.status).toEqual('todo');
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields (nulls)', async () => {
    const result = await createTask(minimalTaskInput);

    expect(result.title).toEqual('Quick task');
    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.status).toEqual('todo');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with in_progress status', async () => {
    const result = await createTask(inProgressTaskInput);

    expect(result.title).toEqual('Review code changes');
    expect(result.description).toEqual('Review and approve pending pull requests');
    expect(result.status).toEqual('in_progress');
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Complete project documentation');
    expect(tasks[0].description).toEqual('Write comprehensive documentation for the task management system');
    expect(tasks[0].status).toEqual('todo');
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
    expect(tasks[0].due_date).toBeInstanceOf(Date);
  });

  it('should save task with null values correctly', async () => {
    const result = await createTask(minimalTaskInput);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Quick task');
    expect(tasks[0].description).toBeNull();
    expect(tasks[0].due_date).toBeNull();
    expect(tasks[0].status).toEqual('todo');
  });

  it('should handle different task statuses correctly', async () => {
    const todoTask = await createTask({ ...basicTaskInput, status: 'todo' });
    const inProgressTask = await createTask({ ...basicTaskInput, title: 'In Progress Task', status: 'in_progress' });
    const doneTask = await createTask({ ...basicTaskInput, title: 'Done Task', status: 'done' });

    expect(todoTask.status).toEqual('todo');
    expect(inProgressTask.status).toEqual('in_progress');
    expect(doneTask.status).toEqual('done');

    // Verify in database
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(3);
    
    const statuses = allTasks.map(task => task.status).sort();
    expect(statuses).toEqual(['done', 'in_progress', 'todo']);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createTask(basicTaskInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should create multiple tasks with unique IDs', async () => {
    const task1 = await createTask({ ...basicTaskInput, title: 'Task 1' });
    const task2 = await createTask({ ...basicTaskInput, title: 'Task 2' });
    const task3 = await createTask({ ...basicTaskInput, title: 'Task 3' });

    expect(task1.id).not.toEqual(task2.id);
    expect(task2.id).not.toEqual(task3.id);
    expect(task1.id).not.toEqual(task3.id);

    // Verify all tasks exist in database
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(3);
    
    const titles = allTasks.map(task => task.title).sort();
    expect(titles).toEqual(['Task 1', 'Task 2', 'Task 3']);
  });
});