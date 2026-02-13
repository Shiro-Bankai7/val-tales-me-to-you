import Image from "next/image";
import Link from "next/link";

const templateButtons = [
  { label: "Scroll of Love", template: "papyrus" },
  { label: "Love Card", template: "love-card" },
  { label: "Text Messages", template: "phone-texts" },
  { label: "Open the Door", template: "door-reveal" }
];

export default function HomePage() {
  return (
    <div className="px-2 py-3">
      <div className="relative overflow-hidden rounded-[28px] border border-[#dcc5bd]">
        <Image
          src="/home/cards-exact.png"
          alt="Valentines Tales landing"
          width={768}
          height={1366}
          className="h-auto w-full object-cover"
          priority
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute inset-x-[4%] top-[46.8%] grid grid-cols-4 gap-[1.8%]">
            {templateButtons.map((item) => (
              <Link
                key={item.template}
                href={`/create?template=${item.template}`}
                className="h-8 rounded-full bg-transparent transition-all hover:bg-white/10 active:scale-90"
                aria-label={item.label}
                title={item.label}
              />
            ))}
          </div>

          {/* Big Envelope Button */}
          <div className="pointer-events-auto absolute bottom-[18%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            <Link
              href="/create"
              className="group flex h-24 w-24 flex-col items-center justify-center rounded-3xl bg-[#fdf2f0] border-2 border-[#f4cdc4] shadow-[0_10px_20px_rgba(244,158,142,0.25)] transition-all hover:-translate-y-1 hover:bg-white hover:shadow-[0_14px_28px_rgba(244,158,142,0.35)] active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-[#ff8ba7]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <polyline points="3 7 12 13 21 7" />
                <circle cx="12" cy="11.5" r="2.5" fill="#ffb3c1" stroke="none" />
                <path d="M12 13c-.5 0-1-.5-1-1s.5-1 1-1 1 .5 1 1-.5 1-1 1z" fill="#ff4d6d" />
              </svg>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d67b71]">Start Here</span>
            </Link>
          </div>

          <Link
            href="/create"
            className="pointer-events-auto absolute left-[16%] top-[73.8%] h-[4.4%] w-[68%] rounded-full bg-transparent transition-all hover:bg-white/10 active:scale-95"
            aria-label="Create Yours"
            title="Create Yours"
          />

          <Link
            href="/create"
            className="pointer-events-auto absolute left-[15%] top-[95.2%] h-[3.6%] w-[42%] rounded-full bg-transparent transition-all hover:bg-white/10 active:scale-95"
            aria-label="Create Yours"
            title="Create Yours"
          />
        </div>
      </div>
    </div>
  );
}

