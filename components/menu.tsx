"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MenuToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn secondary menu-toggle"
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
        Menu
      </button>
      <nav id="site-nav" className={open ? "nav open" : "nav"} onClick={() => setOpen(false)}>
        {children}
      </nav>
    </>
  );
}
