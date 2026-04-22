import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrchardLog / Sadownik+",
  description: "Przestrzen do zarzadzania sadem w OrchardLog / Sadownik+.",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/svg+xml",
      },
    ],
  },
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
