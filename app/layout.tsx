import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrchardLog / Sadownik+",
  description: "Orchard management workspace for OrchardLog / Sadownik+.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
