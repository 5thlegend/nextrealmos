"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Ctx = {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
};

const GenubraCtx = createContext<Ctx | null>(null);

export function GenubraPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return <GenubraCtx.Provider value={{ open, toggle, setOpen }}>{children}</GenubraCtx.Provider>;
}

export function useGenubraPanel() {
  const ctx = useContext(GenubraCtx);
  if (!ctx) throw new Error("useGenubraPanel must be used inside GenubraPanelProvider");
  return ctx;
}
