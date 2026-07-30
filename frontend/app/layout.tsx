import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedAssist AI — Educational Health Guidance",
  description:
    "Understand your symptoms, chat with an AI health assistant, and find nearby care — all educational, never a diagnosis.",
  metadataBase: new URL("https://medassist-ctrlv.vercel.app"),
  openGraph: {
    title: "MedAssist AI",
    description:
      "Understand your symptoms, chat with an AI health assistant, and find nearby care.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
