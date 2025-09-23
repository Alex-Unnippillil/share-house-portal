import { JetBrains_Mono as FontMono, Inter as FontSans } from "next/font/google"
import localFont from "next/font/local"

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const fontDyslexia = localFont({
  src: [
    {
      path: "../public/fonts/open-dyslexic/OpenDyslexic3-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/open-dyslexic/OpenDyslexic3-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/open-dyslexic/OpenDyslexic3-Italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-dyslexic",
  display: "swap",
})