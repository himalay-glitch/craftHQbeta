import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter with its optical-size axis: at headline sizes the browser switches to the
// display cut automatically (font-optical-sizing: auto), the closest open match to
// the tight grotesque used on muse.ai.
const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CraftHQ",
  description: "Your robot build team, shipping 10× faster.",
  icons: {
    icon: [
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

// The login is designed as a near-white page, so it is light-only. The dark tokens in
// globals.css are kept for reference but not applied.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
