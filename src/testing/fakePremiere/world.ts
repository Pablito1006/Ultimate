import { makeProject } from "./factories";
import { resetIdCounter } from "./hash";
import type { FakeProjectData, FakeWorldOptions } from "./types";

export interface FakeWorld {
  hostVersion: string;
  project: FakeProjectData | null;
  transactionLog: string[];
  /** When true, executeTransaction returns false (simulates commit failure). */
  failNextTransaction: boolean;
  undoStack: Array<{ label: string; snapshot: string }>;
}

export function createWorld(options: FakeWorldOptions = {}): FakeWorld {
  resetIdCounter();
  return {
    hostVersion: options.hostVersion ?? "25.6.0",
    project: options.project === undefined ? makeProject() : options.project,
    transactionLog: [],
    failNextTransaction: false,
    undoStack: [],
  };
}

export function snapshotProject(project: FakeProjectData | null): string {
  return JSON.stringify(project);
}
