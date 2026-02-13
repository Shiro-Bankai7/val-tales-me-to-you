import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valentines Tales",
  description: "Create romantic mobile story presentations",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <main className="mobile-shell">{children}</main>
      </body>
    </html>
  );
}
