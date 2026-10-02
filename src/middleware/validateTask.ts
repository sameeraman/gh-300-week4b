import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/appError.js";
import {
  taskStatuses,
  type TaskInput,
  type TaskStatus,
} from "../types/task.js";

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && taskStatuses.includes(value as TaskStatus);
}

export function validateTaskInput(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const errors: string[] = [];
  const body: unknown = request.body;

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "Request body is invalid.",
        ["body must be a JSON object"],
      ),
    );
    return;
  }

  const input = body as Record<string, unknown>;
  const title =
    typeof input.title === "string" && input.title.trim().length > 0
      ? input.title.trim()
      : undefined;
  const description =
    typeof input.description === "string" ? input.description : undefined;
  const status = isTaskStatus(input.status) ? input.status : undefined;

  if (title === undefined) {
    errors.push("title must be a non-empty string");
  }

  if (description === undefined) {
    errors.push("description must be a string");
  }

  if (status === undefined) {
    errors.push(`status must be one of: ${taskStatuses.join(", ")}`);
  }

  if (
    errors.length > 0 ||
    title === undefined ||
    description === undefined ||
    status === undefined
  ) {
    next(
      new AppError(
        400,
        "VALIDATION_ERROR",
        "Request body is invalid.",
        errors,
      ),
    );
    return;
  }

  request.body = {
    title,
    description,
    status,
  } satisfies TaskInput;
  next();
}
