import { PLUGIN_NAME, PLUGIN_VERSION } from "../../core/constants/version";
import { Logger } from "../../core/logging/Logger";

export function bootstrap(): void {
  Logger.configure({ environment: "development", minLevel: "debug" });
  Logger.info(`${PLUGIN_NAME} starting`, { version: PLUGIN_VERSION });
}
