import express from "express";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";
import { taskRouter } from "./routes/tasks.js";

export const app = express();

app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/tasks", taskRouter);
app.use(notFoundHandler);
app.use(errorHandler);
