import { describe, expect, it } from "vitest";
import {
  AppError,
  PremiereError,
  toUserMessage,
  ValidationError,
} from "../../src/core/errors/AppError";

describe("AppError hierarchy", () => {
  it("exposes user-facing message and code", () => {
    const error = new PremiereError("No active project.");
    expect(error.code).toBe("PREMIERE_ERROR");
    expect(error.userMessage).toBe("No active project.");
    expect(toUserMessage(error)).toBe("No active project.");
  });

  it("maps unknown errors safely", () => {
    expect(toUserMessage(new Error("boom"))).toBe("boom");
    expect(toUserMessage("x")).toBe("An unexpected error occurred.");
  });

  it("keeps validation distinct from generic app errors", () => {
    const error = new ValidationError("Invalid rename pattern.");
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
