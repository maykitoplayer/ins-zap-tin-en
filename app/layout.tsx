import type React from "react"
import type { Metadata } from "next"
import Script from "next/script" // 1. Importar o componente Script
import "./globals.css"



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      {/* O <head> é gerido pelo Next.js através do metadata e do Script. 
          Não é necessário declará-lo aqui. */}
      <body>
        {/* Google Tag Manager (noscript) - Colocado logo após a abertura do <body> */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MC8QD7T9"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        
        {children}

        {/* 2. Usar o componente <Script> em vez da tag <script> manual */}
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-MC8QD7T9');
          `}
        </Script>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.app'
    };
