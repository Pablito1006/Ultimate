import { describe, expect, it } from "vitest";
import { validateTemplateJson } from "../../src/features/motion/templates/validateTemplateJson";

describe("validateTemplateJson", () => {
  it("accepts a minimal valid template", () => {
    const result = validateTemplateJson({
      id: "mm-test-16x9",
      name: "Test",
      category: "Titles",
      version: "1.0.0",
      tags: ["test"],
      description: "x",
      minPremiere: "25.6.0",
      durationDefault: 3,
      aspect: "16:9",
      fps: 30,
      parameters: [
        {
          id: "title",
          label: { en: "Title", fr: "Titre" },
          type: "text",
          masterPropertyName: "MM_Title",
          defaultValue: "Hi",
        },
      ],
      animation: { inDuration: 0.4, outDuration: 0.3, loop: false },
      previewSpec: { kind: "title-reveal", seed: 1 },
      license: "MIT",
      author: "Test",
      status: "missing-mogrt",
    });
    expect(result.ok).toBe(true);
    expect(result.template?.id).toBe("mm-test-16x9");
  });

  it("rejects missing license and bad aspect", () => {
    const result = validateTemplateJson({
      id: "bad",
      name: "Bad",
      category: "Titles",
      version: "1",
      tags: ["x"],
      minPremiere: "25.6.0",
      durationDefault: 1,
      aspect: "3:2",
      fps: 24,
      parameters: [{ id: "a", type: "text", masterPropertyName: "MM_A", defaultValue: "" }],
      animation: {},
      previewSpec: { kind: "title-reveal", seed: 1 },
      license: "",
      author: "x",
      status: "ready",
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "aspect" || i.path === "license")).toBe(true);
  });
});
