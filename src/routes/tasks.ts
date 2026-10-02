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
  response.status(200).json(listTasks());
});

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
