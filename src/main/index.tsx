import { createRoot } from "react-dom/client";
import { Logger } from "../core/logging/Logger";
import { App } from "../ui/App";
import { bootstrap } from "./lifecycle/bootstrap";

function mount(): void {
  bootstrap();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    Logger.error("Missing #root element in index.html");
    return;
  }

  const root = createRoot(rootElement);
  root.render(<App />);
  Logger.info("UI mounted");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
