export { createFakePremiereModule } from "./createModule";
export { makeProject, makeSequence } from "./factories";
export { createWorld, type FakeWorld } from "./world";
export type {
  FakeProjectData,
  FakeSequenceData,
  FakeWorldOptions,
  MakeProjectOptions,
  MakeSequenceOptions,
} from "./types";
export { fnv1aHex, nextId, resetIdCounter } from "./hash";

import { setPremiereModuleForTests } from "../../premiere/adapters/premiereModule";
import { setUxpModuleForTests } from "../../premiere/adapters/uxpModule";
import { createFakePremiereModule } from "./createModule";
import type { FakeWorldOptions } from "./types";
import type { FakeWorld } from "./world";

export interface InstalledFakePremiere {
  world: FakeWorld;
  uninstall: () => void;
}

/**
 * Installs a fake premierepro (+ minimal uxp.host) for contract tests.
 */
export function installFakePremiere(options: FakeWorldOptions = {}): InstalledFakePremiere {
  const { module, world } = createFakePremiereModule(options);
  setPremiereModuleForTests(module);
  setUxpModuleForTests({
    host: {
      name: "premierepro",
      version: world.hostVersion,
      uiLocale: "en_US",
    },
  } as typeof import("uxp"));

  return {
    world,
    uninstall() {
      setPremiereModuleForTests(null);
      setUxpModuleForTests(null);
    },
  };
}
