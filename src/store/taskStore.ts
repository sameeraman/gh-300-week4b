import { randomUUID } from "node:crypto";

import type { Task, TaskInput } from "../types/task.js";

const tasks: Task[] = [];

export function listTasks(): Task[] {
  return tasks;
}

export function findTask(id: string): Task | undefined {
  return tasks.find((task) => task.id === id);
}

export function createTask(input: TaskInput): Task {
  const timestamp = new Date().toISOString();
  const task: Task = {
    id: randomUUID(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  tasks.push(task);
  return task;
}

export function updateTask(id: string, input: TaskInput): Task | undefined {
  const task = findTask(id);

  if (!task) {
    return undefined;
  }

  task.title = input.title;
  task.description = input.description;
  task.status = input.status;
  task.updatedAt = new Date().toISOString();
  return task;
}

export function deleteTask(id: string): boolean {
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return false;
  }

  tasks.splice(index, 1);
  return true;
}

export function clearTasks(): void {
  tasks.length = 0;
}
