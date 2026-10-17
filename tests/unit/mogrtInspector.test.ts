import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  draftTemplateFromMasters,
  extractMasterProperties,
  inspectDefinitionJson,
} from "../../src/features/motion/templates/mogrtInspector";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/mogrt");

describe("mogrtInspector", () => {
  it("extracts masters from fixture definition.json", () => {
    const defPath = join(fixtures, "definition.json");
    const definition = JSON.parse(readFileSync(defPath, "utf8"));
    const masters = extractMasterProperties(definition);
    expect(masters.map((m) => m.name)).toContain("MM_Title");
    expect(masters.map((m) => m.name)).toContain("MM_ColorPrimary");
    const inspection = inspectDefinitionJson(definition, ["definition.json"]);
    expect(inspection.ok).toBe(true);
  });

  it("opens sample-mm-title.mogrt as ZIP and finds definition.json", () => {
    const mogrtPath = join(fixtures, "sample-mm-title.mogrt");
    const buf = new Uint8Array(readFileSync(mogrtPath));
    const files = unzipSync(buf);
    const key = Object.keys(files).find((k) => k.endsWith("definition.json"));
    expect(key).toBeTruthy();
    const definition = JSON.parse(strFromU8(files[key as string]));
    expect(extractMasterProperties(definition).length).toBeGreaterThanOrEqual(4);
  });

  it("drafts template.json from masters", () => {
    const draft = draftTemplateFromMasters(
      "imported-1",
      [{ name: "MM_Title", type: "text", uiName: "Title" }],
      "foo.mogrt"
    );
    expect(draft.mogrt).toBe("foo.mogrt");
    expect((draft.parameters as Array<{ masterPropertyName: string }>)[0].masterPropertyName).toBe(
      "MM_Title"
    );
  });
});
