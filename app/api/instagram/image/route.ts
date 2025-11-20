import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // 1. Validação de Segurança (Whitelist)
    // Permite apenas domínios de imagem do Meta/Instagram para evitar uso indevido do seu servidor
    try {
      const urlObj = new URL(imageUrl)
      const allowedDomains = [
        "instagram.com", 
        "cdninstagram.com", 
        "fbcdn.net", 
        "scontent" // Comum em URLs do Instagram
      ]
      
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain))
      
      if (!isAllowed) {
        console.error(`[v0] Blocked attempt to proxy unauthorized domain: ${urlObj.hostname}`)
        return NextResponse.json({ error: "Forbidden: Domain not allowed" }, { status: 403 })
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    console.log("[v0] Proxying Instagram image:", imageUrl.substring(0, 50) + "...")

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout

    try {
      const response = await fetch(imageUrl, {
        headers: {
          // 2. User-Agent atualizado (Chrome mais recente)
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
          "Referer": "https://www.instagram.com/",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site"
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error("[v0] Failed to fetch Instagram image:", response.status)
        return NextResponse.json({ error: "Failed to fetch image from source" }, { status: response.status })
      }

      const imageBuffer = await response.arrayBuffer()
      const contentType = response.headers.get("content-type") || "image/jpeg"

      // 3. Headers de Cache otimizados
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          // Cache agressivo (público, 7 dias) para evitar bater no Instagram toda hora
          "Cache-Control": "public, max-age=604800, immutable", 
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === "AbortError") {
        return NextResponse.json({ error: "Request timeout" }, { status: 504 })
      }
      console.error("[v0] Error details:", fetchError)
      throw fetchError
    }
  } catch (error: any) {
    console.error("[v0] Error proxying Instagram image:", error.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
