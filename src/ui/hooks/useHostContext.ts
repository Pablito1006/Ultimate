import { useCallback, useEffect, useState } from "react";
import { toUserMessage } from "../../core/errors/AppError";
import { Logger } from "../../core/logging/Logger";
import {
  applicationService,
  type HostContextSnapshot,
} from "../../premiere/application/ApplicationService";

export interface UseHostContextState {
  loading: boolean;
  error: string | null;
  context: HostContextSnapshot | null;
  refresh: () => Promise<void>;
}

export function useHostContext(): UseHostContextState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<HostContextSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await applicationService.refreshContext();
      setContext(next);
    } catch (cause) {
      const message = toUserMessage(cause);
      Logger.error("Host context refresh failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, context, refresh };
}
