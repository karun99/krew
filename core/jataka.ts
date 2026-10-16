/**
 * JATAKA — the local wisdom library (FR-G5).
 * Records lessons learned across tasks and retrieves them by problem class.
 * Stored in an embedded SQLite database so no server is required
 * (C3, C13: low resource, everything on disk).
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { findRoot } from "./config.ts";

export interface Lesson {
  id: string;
  problemClass: string;
  lesson: string;
  createdAt: number;
}

export class Jataka {
  #db: DatabaseSync | null = null;
  #ready = false;

  private connect(): DatabaseSync {
    if (!this.#db) {
      const root = findRoot();
      const dir = path.join(root, "jataka");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      this.#db = new DatabaseSync(path.join(dir, "wisdom.db"));
    }
    if (!this.#ready) {
      this.#db.exec(`
        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          problem_class TEXT NOT NULL,
          lesson TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_class ON lessons (problem_class);
      `);
      this.#ready = true;
    }
    return this.#db;
  }

  /** Record a lesson discovered while solving a problem class. */
  record(problemClass: string, lesson: string): void {
    const db = this.connect();
    db.prepare(
      "INSERT INTO lessons (id, problem_class, lesson, created_at) VALUES (?, ?, ?, ?)",
    ).run(`l-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, problemClass, lesson, Date.now());
  }

  /** Retrieve lessons for a problem class, newest last. */
  lessons(problemClass: string, limit = 20): Lesson[] {
    const db = this.connect();
    const rows = db
      .prepare("SELECT id, problem_class, lesson, created_at FROM lessons WHERE problem_class = ? ORDER BY created_at DESC LIMIT ?")
      .all(problemClass, limit) as Array<Record<string, unknown>>;
    return rows.map((row) => ({
      id: String(row.id),
      problemClass: String(row.problem_class),
      lesson: String(row.lesson),
      createdAt: Number(row.created_at),
    }));
  }

  isAvailable(): boolean {
    try {
      this.connect();
      return true;
    } catch {
      return false;
    }
  }
}
