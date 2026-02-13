"use client";

import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "touch-btn w-full rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99]",
        variant === "primary" && "border-[#cda79b] bg-[#bf978c] text-[#fff8f4]",
        variant === "secondary" && "border-[#d2b5ab] bg-[#f3e5df] text-[#6a4b44]",
        variant === "ghost" && "border-transparent bg-transparent text-[#6a4b44]",
        className
      )}
      {...props}
    />
  );
}
