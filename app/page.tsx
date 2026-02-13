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
                className="h-8 rounded-full bg-transparent"
                aria-label={item.label}
                title={item.label}
              />
            ))}
          </div>

          <Link
            href="/create"
            className="pointer-events-auto absolute left-[16%] top-[73.8%] h-[4.4%] w-[68%] rounded-full bg-transparent"
            aria-label="Create Yours"
            title="Create Yours"
          />

          <Link
            href="/create"
            className="pointer-events-auto absolute left-[15%] top-[95.2%] h-[3.6%] w-[42%] rounded-full bg-transparent"
            aria-label="Create Yours"
            title="Create Yours"
          />
        </div>
      </div>
    </div>
  );
}

