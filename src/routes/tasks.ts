import { Router } from "express";

import { AppError } from "../errors/appError.js";
import { validateTaskInput } from "../middleware/validateTask.js";
import {
  createTask,
  deleteTask,
  findTask,
  listTasks,
  updateTask,
} from "../store/taskStore.js";
import type { TaskInput } from "../types/task.js";

export const taskRouter = Router();
type TaskParams = { id: string };

taskRouter.get("/", (_request, response) => {
  const query = _request.query;
  const rawLimit = query.limit;
  const limit = rawLimit === undefined ? 20 : parseLimit(rawLimit);
  const cursor = parseCursor(query.cursor);
  const tasks = listTasks().slice().sort((left, right) => {
    const createdAtOrder = right.createdAt.localeCompare(left.createdAt);
    return createdAtOrder || right.id.localeCompare(left.id);
  });
  const cursorIndex = cursor === undefined
    ? -1
    : tasks.findIndex((task) => task.id === cursor);

  if (cursor !== undefined && cursorIndex === -1) {
    throw new AppError(
      400,
      "INVALID_CURSOR",
      "Query parameter 'cursor' must encode the ID of an existing task.",
    );
  }

  const page = tasks.slice(cursorIndex + 1, cursorIndex + 1 + limit);
  const hasMore = cursorIndex + 1 + page.length < tasks.length;

  response.status(200).json({
    data: page,
    nextCursor: hasMore
      ? Buffer.from(page[page.length - 1]!.id).toString("base64")
      : null,
    hasMore,
  });
});

function parseLimit(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value) ||
    Number(value) > 100
  ) {
    throw new AppError(
      400,
      "INVALID_LIMIT",
      "Query parameter 'limit' must be an integer between 1 and 100.",
    );
  }

  return Number(value);
}

function parseCursor(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(
      400,
      "INVALID_CURSOR",
      "Query parameter 'cursor' must be a base64-encoded task ID.",
    );
  }

  const decoded = Buffer.from(value, "base64").toString("utf8");
  if (
    decoded.length === 0 ||
    Buffer.from(decoded, "utf8").toString("base64") !== value
  ) {
    throw new AppError(
      400,
      "INVALID_CURSOR",
      "Query parameter 'cursor' must be a base64-encoded task ID.",
    );
  }

  return decoded;
}

taskRouter.get<TaskParams>("/:id", (request, response, next) => {
  const task = findTask(request.params.id);

  if (!task) {
    next(new AppError(404, "TASK_NOT_FOUND", "Task was not found."));
    return;
  }

  response.status(200).json(task);
});

taskRouter.post("/", validateTaskInput, (request, response) => {
  const task = createTask(request.body as TaskInput);
  response.status(201).json(task);
});

taskRouter.put<TaskParams>("/:id", validateTaskInput, (request, response, next) => {
  const task = updateTask(request.params.id, request.body as TaskInput);

  if (!task) {
    next(new AppError(404, "TASK_NOT_FOUND", "Task was not found."));
    return;
  }

  response.status(200).json(task);
});

taskRouter.delete<TaskParams>("/:id", (request, response, next) => {
  if (!deleteTask(request.params.id)) {
    next(new AppError(404, "TASK_NOT_FOUND", "Task was not found."));
    return;
  }

  response.status(204).send();
});
