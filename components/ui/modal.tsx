"use client";

import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  onClose,
  children,
  className
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2">
      <button type="button" onClick={onClose} className="absolute inset-0" aria-label="Close modal" />
      <div
        className={cn(
          "relative w-full max-w-[430px] rounded-t-[24px] border border-[#d7bbb1] bg-[#f6ece8] p-3",
          className
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#6d4e47]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#d2b5ab] bg-[#f3e5df] px-2 py-1 text-xs text-[#6f5049]"
          >
            Close
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

