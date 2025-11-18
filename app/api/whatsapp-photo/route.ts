import { type NextRequest, NextResponse } from "next/server"

// Cache para armazenar resultados por 5 minutos
const cache = new Map<string, { result: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export async function POST(request: NextRequest) {
  // --- CORREÇÃO 1: LER A CHAVE DA API DE FORMA SEGURA ---
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  // --- CORREÇÃO 2: VERIFICAR SE A CHAVE EXISTE ANTES DE USAR ---
  if (!rapidApiKey) {
    console.error("CRITICAL ERROR: RAPIDAPI_KEY not found in environment variables!");
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Fallback padrão caso a API falhe
  const fallbackPayload = {
    success: true,
    result: "https://i.postimg.cc/gcNd6QBM/img1.jpg",
    is_photo_private: true,
  }

  try {
    const { phone, countryCode } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
      )
    }

    const cleanNumber = phone.replace(/\D/g, "")
    const cleanCountryCode = countryCode?.replace(/\D/g, "") || ""
    const fullPhone = cleanCountryCode + cleanNumber

    // Verifica cache
    const cached = cache.get(fullPhone)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[v0] Returning cached WhatsApp photo")
      return NextResponse.json(
        { success: true, result: cached.result, is_photo_private: false },
        { status: 200, headers: { "Access-Control-Allow-Origin": "*" } },
      )
    }

    const apiUrl = `https://whatsapp-data1.p.rapidapi.com/number/${fullPhone}?base64=false&telegram=false&google=false`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        // --- CORREÇÃO 3: USAR A VARIÁVEL SEGURA EM VEZ DA CHAVE HARDCODED ---
        "X-RapidAPI-Key": rapidApiKey,
        "X-RapidAPI-Host": "whatsapp-data1.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout?.(10_000),
    })

    console.log("[v0] API Response status:", response.status)

    // Tratamento de rate limit
    if (response.status === 429) {
      console.log("[v0] Rate limit exceeded, returning fallback")
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    // Verifica se a resposta foi bem-sucedida
    if (!response.ok) {
      console.error("[v0] Erro ao buscar foto:", response.status)
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const responseText = await response.text()
    console.log("[v0] API Response body:", responseText)

    let photoUrl: string
    try {
      const jsonResponse = JSON.parse(responseText)
      // Tenta várias chaves comuns para a URL da foto
      photoUrl = jsonResponse.profilePic || jsonResponse.url || jsonResponse.result || jsonResponse.photo_url || jsonResponse.picture_url
    } catch {
      // Se não for JSON, trata como URL direta
      photoUrl = responseText.trim()
    }

    // Valida se a resposta contém uma URL válida
    if (!photoUrl || !photoUrl.startsWith("https://")) {
      console.log("[v0] Invalid or empty response, returning fallback")
      return NextResponse.json(fallbackPayload, {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    // Armazena no cache
    cache.set(fullPhone, {
      result: photoUrl.trim(),
      timestamp: Date.now(),
    })

    // Limita o tamanho do cache
    if (cache.size > 100) {
      const oldestKey = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      cache.delete(oldestKey)
    }

    // Retorna a URL da foto de perfil
    return NextResponse.json(
      {
        success: true,
        result: photoUrl.trim(),
        is_photo_private: false,
      },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    )
  } catch (error) {
    console.error("[v0] Erro na requisição:", error)
    return NextResponse.json(fallbackPayload, {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
