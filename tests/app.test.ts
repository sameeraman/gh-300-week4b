import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { app } from "../src/app.js";
import { clearTasks } from "../src/store/taskStore.js";

beforeEach(() => {
  clearTasks();
});

describe("GET /health", () => {
  it("returns the health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("task CRUD contracts", () => {
  it("supports the full CRUD lifecycle with the required statuses", async () => {
    const emptyList = await request(app).get("/tasks");
    expect(emptyList.status).toBe(200);
    expect(emptyList.body).toEqual([]);

    const created = await request(app).post("/tasks").send({
      title: "Write tests",
      description: "Cover the API contracts",
      status: "todo",
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      title: "Write tests",
      description: "Cover the API contracts",
      status: "todo",
    });
    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    const id: string = created.body.id;
    const fetched = await request(app).get(`/tasks/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(id);

    const updated = await request(app).put(`/tasks/${id}`).send({
      title: "Write baseline tests",
      description: "Cover every success status",
      status: "in-progress",
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      id,
      title: "Write baseline tests",
      description: "Cover every success status",
      status: "in-progress",
    });

    const populatedList = await request(app).get("/tasks");
    expect(populatedList.status).toBe(200);
    expect(populatedList.body).toHaveLength(1);

    const deleted = await request(app).delete(`/tasks/${id}`);
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");
  });

  it("returns 404 for missing task resources", async () => {
    const missingId = "missing-task";

    const fetched = await request(app).get(`/tasks/${missingId}`);
    expect(fetched.status).toBe(404);
    expect(fetched.body).toEqual({
      error: {
        code: "TASK_NOT_FOUND",
        message: "Task was not found.",
      },
    });

    const updated = await request(app).put(`/tasks/${missingId}`).send({
      title: "Missing",
      description: "This task does not exist",
      status: "todo",
    });
    expect(updated.status).toBe(404);

    const deleted = await request(app).delete(`/tasks/${missingId}`);
    expect(deleted.status).toBe(404);
  });
});

describe("task input validation", () => {
  it("returns a consistent JSON error for invalid input", async () => {
    const response = await request(app).post("/tasks").send({
      title: "",
      description: 42,
      status: "blocked",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is invalid.",
        details: expect.any(Array),
      },
    });
  });
});
