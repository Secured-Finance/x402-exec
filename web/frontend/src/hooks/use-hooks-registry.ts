import type { HookInfo } from "@/types/scan";
import { MOCK_HOOKS } from "@/hooks/use-transactions";

// Simple mocked hook registry reader. In the future, swap with /hook API.
export function useHooksRegistry(): HookInfo[] {
  // No async for mock; keep a stable shape to ease replacement later
  return Object.values(MOCK_HOOKS);
}
