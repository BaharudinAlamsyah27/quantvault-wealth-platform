"use client";

import { HelpCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  description: string;
}

export function HelpTip({ title, description }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <span className="helptip-wrap" ref={containerRef}>
      <button
        type="button"
        className="helptip-btn"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`Penjelasan: ${title}`}
        aria-expanded={open}
        title={title}
      >
        <HelpCircle size={14} strokeWidth={1.8} />
      </button>
      {open && (
        <span className="helptip-popover" role="tooltip">
          <strong>{title}</strong>
          <span>{description}</span>
        </span>
      )}
    </span>
  );
}
