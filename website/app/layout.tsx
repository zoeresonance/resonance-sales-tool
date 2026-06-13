import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resonance Score",
  description:
    "Instantly score any brand's organic social media presence. Enter a Facebook or Instagram URL to see how well their content resonates with their audience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
