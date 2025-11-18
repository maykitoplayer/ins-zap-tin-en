import type React from "react"
import type { Metadata } from "next"
import { GoogleTagManager } from "@next/third-parties/google"
import "./globals.css"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManager gtmId="GTM-MC8QD7T9" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.app'
};
