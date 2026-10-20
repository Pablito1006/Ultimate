import type { Macro, MacroStep } from "./macroTypes";
import { MACRO_SCHEMA_VERSION } from "./macroTypes";

function stepsToActions(steps: MacroStep[]): Macro["actions"] {
  const actions: Macro["actions"] = [];
  const walk = (list: MacroStep[]): void => {
    for (const s of list) {
      if (s.kind === "action") {
        actions.push({ id: s.id, type: s.type, params: s.params });
      } else if (s.kind === "setVar") {
        actions.push({
          id: s.id,
          type: "setVariable",
          params: { name: s.name, value: s.value },
        });
      } else if (s.kind === "preview") {
        actions.push({
          id: s.id,
          type: "noop",
          params: { preview: true, label: s.label },
        });
      } else if (s.kind === "if") {
        walk(s.then);
        if (s.else) {
          walk(s.else);
        }
      } else if (s.kind === "loop") {
        walk(s.steps);
      }
    }
  };
  walk(steps);
  return actions;
}

function recipe(
  id: string,
  name: string,
  description: string,
  variables: Record<string, string | number | boolean>,
  steps: MacroStep[],
  tags: string[]
): Macro {
  return {
    schemaVersion: MACRO_SCHEMA_VERSION,
    id,
    name,
    description,
    variables,
    steps,
    actions: stepsToActions(steps),
    stopOnError: true,
    tags,
  };
}

/** Ready-made macros (≥3 recipes; one with ≥10 executable steps). */
export const MACRO_LIBRARY: Macro[] = [
  recipe(
    "macro_prepare_short",
    "Préparer un short vertical",
    "Analyse → variables → marqueurs de repère → préfixe → mute A1 → unmute → boucle marqueurs → log.",
    { platform: "shorts", markerPrefix: "MM:Short", loops: 2 },
    [
      { kind: "preview", id: "p0", label: "Vérifier format 9:16 dans Premiere" },
      { kind: "action", id: "s1", type: "analyzeTimeline" },
      { kind: "setVar", id: "s2", name: "ready", value: true },
      {
        kind: "if",
        id: "s3",
        when: { left: "ready", op: "truthy" },
        then: [
          {
            kind: "action",
            id: "s4",
            type: "addMarkerAtPlayhead",
            params: { name: "MM:Short Start", comments: "Short prep" },
          },
        ],
        else: [{ kind: "action", id: "s4e", type: "logMessage", params: { message: "skip" } }],
      },
      {
        kind: "action",
        id: "s5",
        type: "renameSelectedPrefix",
        params: { prefix: "Short_" },
      },
      { kind: "action", id: "s6", type: "muteAudioTrack", params: { trackIndex: 0 } },
      { kind: "action", id: "s7", type: "unmuteAudioTrack", params: { trackIndex: 0 } },
      {
        kind: "loop",
        id: "s8",
        times: "loops",
        steps: [
          {
            kind: "action",
            id: "s8a",
            type: "addMarkerAtPlayhead",
            params: { name: "MM:Beat", comments: "loop" },
          },
        ],
      },
      { kind: "action", id: "s9", type: "analyzeTimeline" },
      {
        kind: "action",
        id: "s10",
        type: "logMessage",
        params: { message: "Short vertical préparé (plan 10 étapes)" },
      },
    ],
    ["short", "vertical", "recipe"]
  ),
  recipe(
    "macro_youtube_delivery",
    "Livraison YouTube",
    "Checklist livraison : analyse, marqueurs QC, préfixe export, logs.",
    { platform: "youtube" },
    [
      { kind: "preview", id: "y0", label: "Ouvrir panneau Delivery pour export AME" },
      { kind: "action", id: "y1", type: "analyzeTimeline" },
      {
        kind: "action",
        id: "y2",
        type: "addMarkerAtPlayhead",
        params: { name: "MM:QC", comments: "Pre-delivery" },
      },
      {
        kind: "action",
        id: "y3",
        type: "renameSelectedPrefix",
        params: { prefix: "YT_" },
      },
      { kind: "action", id: "y4", type: "logMessage", params: { message: "Prêt Delivery → YouTube" } },
      { kind: "action", id: "y5", type: "analyzeTimeline" },
    ],
    ["youtube", "delivery", "recipe"]
  ),
  recipe(
    "macro_interview_pack",
    "Habillage interview",
    "Marqueurs lower-third / cutaway, mute piste bruit, analyse.",
    { guest: "Guest" },
    [
      { kind: "preview", id: "i0", label: "Sélectionner clips interview" },
      {
        kind: "action",
        id: "i1",
        type: "addMarkerAtPlayhead",
        params: { name: "MM:LT", comments: "Lower third" },
      },
      {
        kind: "action",
        id: "i2",
        type: "addMarkerAtPlayhead",
        params: { name: "MM:Broll", comments: "Cutaway" },
      },
      {
        kind: "action",
        id: "i3",
        type: "renameSelectedPrefix",
        params: { prefix: "IV_" },
      },
      { kind: "action", id: "i4", type: "muteAudioTrack", params: { trackIndex: 1 } },
      { kind: "action", id: "i5", type: "analyzeTimeline" },
      {
        kind: "action",
        id: "i6",
        type: "logMessage",
        params: { message: "Habillage interview balisé" },
      },
    ],
    ["interview", "recipe"]
  ),
  // Keep simple builtins for backward compat
  recipe(
    "macro_analyze",
    "Analyze Timeline",
    "Refresh timeline analysis summary.",
    {},
    [{ kind: "action", id: "a1", type: "analyzeTimeline" }],
    ["builtin"]
  ),
  recipe(
    "macro_marker",
    "Mark Playhead",
    "Add a Comment marker at the playhead.",
    {},
    [
      {
        kind: "action",
        id: "a1",
        type: "addMarkerAtPlayhead",
        params: { name: "MM Cue", comments: "Macro marker" },
      },
    ],
    ["builtin"]
  ),
  recipe(
    "macro_prefix",
    "Prefix Selected Clips",
    "Prefix selected project panel items with MM_.",
    {},
    [{ kind: "action", id: "a1", type: "renameSelectedPrefix", params: { prefix: "MM_" } }],
    ["builtin"]
  ),
  recipe(
    "macro_mute_a1",
    "Mute A1",
    "Mute audio track index 0.",
    {},
    [{ kind: "action", id: "a1", type: "muteAudioTrack", params: { trackIndex: 0 } }],
    ["builtin"]
  ),
];

/** Exactly 10 expanding steps for contract acceptance (plan → apply → verify). */
export function buildTenStepAcceptanceMacro(): Macro {
  const steps: MacroStep[] = [
    { kind: "setVar", id: "t1", name: "n", value: 1 },
    { kind: "action", id: "t2", type: "analyzeTimeline" },
    { kind: "action", id: "t3", type: "noop" },
    { kind: "action", id: "t4", type: "logMessage", params: { message: "step4" } },
    { kind: "setVar", id: "t5", name: "flag", value: true },
    {
      kind: "if",
      id: "t6",
      when: { left: "flag", op: "eq", right: "=true" },
      then: [{ kind: "action", id: "t7", type: "logMessage", params: { message: "branch-ok" } }],
    },
    {
      kind: "loop",
      id: "t8",
      times: 2,
      steps: [{ kind: "action", id: "t8a", type: "noop" }],
    },
    { kind: "preview", id: "t9", label: "Gate preview" },
    { kind: "action", id: "t10", type: "analyzeTimeline" },
  ];
  return recipe(
    "macro_ten_step",
    "Acceptance 10-step",
    "Contract: plan → apply → verify with variables/if/loop/preview.",
    {},
    steps,
    ["test"]
  );
}
