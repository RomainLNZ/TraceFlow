import { Router } from "express";

export const agileRouter = Router();

agileRouter.get("/board", (_req, res) => {
  res.json({
    columns: [
      { id: "BACKLOG", title: "Backlog" },
      { id: "TODO", title: "A faire" },
      { id: "IN_PROGRESS", title: "En cours" },
      { id: "REVIEW", title: "En revue" },
      { id: "TESTING", title: "Tests" },
      { id: "BLOCKED", title: "Bloque" },
      { id: "DONE", title: "Termine" }
    ],
    items: []
  });
});
