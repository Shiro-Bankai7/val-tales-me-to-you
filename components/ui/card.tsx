import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[#e4cbc2] bg-gradient-to-b from-[#f9f1ed] to-[#f4e7e2] p-3.5 shadow-[0_10px_25px_rgba(145,97,82,0.12)]",
        className
      )}
      {...props}
    />
  );
}
