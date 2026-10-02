import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { app } from "../src/app.js";
import { clearTasks } from "../src/store/taskStore.js";

beforeEach(() => {
  clearTasks();
});

afterEach(() => {
  vi.restoreAllMocks();
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
    expect(emptyList.body).toEqual({
      data: [],
      nextCursor: null,
      hasMore: false,
    });

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
    expect(populatedList.body.data).toHaveLength(1);

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

  it("returns tasks newest first across cursor-based pages", async () => {
    const timestamps = Array.from(
      { length: 12 },
      (_, index) => new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    );
    vi.spyOn(Date.prototype, "toISOString").mockImplementation(
      () => timestamps.shift() ?? "2026-01-01T00:00:00.000Z",
    );

    for (let index = 0; index < 12; index += 1) {
      const created = await request(app).post("/tasks").send({
        title: `Task ${index}`,
        description: "",
        status: "todo",
      });
      expect(created.status).toBe(201);
    }

    const firstPage = await request(app).get("/tasks?limit=5");
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data).toHaveLength(5);
    expect(firstPage.body.data.map((task: { title: string }) => task.title)).toEqual([
      "Task 11",
      "Task 10",
      "Task 9",
      "Task 8",
      "Task 7",
    ]);
    expect(firstPage.body.hasMore).toBe(true);
    expect(Buffer.from(firstPage.body.nextCursor, "base64").toString()).toBe(
      firstPage.body.data[4].id,
    );

    const secondPage = await request(app)
      .get("/tasks")
      .query({ limit: 5, cursor: firstPage.body.nextCursor });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.map((task: { title: string }) => task.title)).toEqual([
      "Task 6",
      "Task 5",
      "Task 4",
      "Task 3",
      "Task 2",
    ]);
    expect(secondPage.body.hasMore).toBe(true);

    const lastPage = await request(app)
      .get("/tasks")
      .query({ limit: 5, cursor: secondPage.body.nextCursor });
    expect(lastPage.status).toBe(200);
    expect(lastPage.body.data.map((task: { title: string }) => task.title)).toEqual([
      "Task 1",
      "Task 0",
    ]);
    expect(lastPage.body).toMatchObject({ nextCursor: null, hasMore: false });
  });

  it("uses a default page size of 20", async () => {
    for (let index = 0; index < 21; index += 1) {
      await request(app).post("/tasks").send({
        title: `Task ${index}`,
        description: "",
        status: "todo",
      });
    }

    const response = await request(app).get("/tasks");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(20);
    expect(response.body.hasMore).toBe(true);
    expect(response.body.nextCursor).toEqual(expect.any(String));
  });

  it.each(["0", "101", "1.5", "invalid"])(
    "rejects invalid limit %s",
    async (limit) => {
      const response = await request(app).get("/tasks").query({ limit });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: {
          code: "INVALID_LIMIT",
          message: "Query parameter 'limit' must be an integer between 1 and 100.",
        },
      });
    },
  );

  it("rejects malformed and unknown cursors", async () => {
    const malformed = await request(app).get("/tasks?cursor=not-base64!");
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_CURSOR");

    const unknown = await request(app)
      .get("/tasks")
      .query({ cursor: Buffer.from("missing-task").toString("base64") });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("INVALID_CURSOR");
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
