import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { createLiscaQueryClient } from "./createLiscaQueryClient";

export function LiscaQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => createLiscaQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
