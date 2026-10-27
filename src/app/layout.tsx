import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono, Press_Start_2P } from "next/font/google"

import { getContent } from "@/lib/content/read"
import { siteUrl } from "@/lib/env"
import "./globals.css"
import "./minecraft/theme.css"

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  // Width is the only extra axis we animate (the hero name); weight is always included.
  axes: ["wdth"],
  display: "swap",
})

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
})

const pixel = Press_Start_2P({ variable: "--font-pixel", weight: "400", subsets: ["latin"], display: "swap" })

export async function generateMetadata(): Promise<Metadata> {
  const { seo, profile } = await getContent()
  return {
    metadataBase: new URL(siteUrl),
    title: { default: seo.title, template: `%s — ${profile.name}` },
    description: seo.description,
    keywords: seo.keywords,
    authors: [{ name: profile.name, url: siteUrl }],
    creator: profile.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: siteUrl,
      siteName: profile.name,
      title: seo.title,
      description: seo.description,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
    robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${bricolage.variable} ${instrument.variable} ${jetbrains.variable} ${pixel.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  )
}
