import { type NextRequest, NextResponse } from "next/server"

// Cache simples em memória
const cache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 })

    const cleanUsername = username.replace("@", "").trim()

    // Verifica Cache
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, profile: cached.profile }, { status: 200 })
    }

    console.log(`[v0] Buscando via Social API (Hardcoded Key) para: ${cleanUsername}`)

    // --- URL DA API QUE VOCÊ TESTOU E FUNCIONOU ---
    const url = `https://instagram-social-api.p.rapidapi.com/v1/search_users?search_query=${cleanUsername}`
    
    // --- AQUI ESTÁ O SEGREDO: A CHAVE DIRETO NO CÓDIGO ---
    // (Isso elimina erro de configuração do Vercel)
    const apiKey = "de5a32c447msh5b20113fb3e2910p1c3229jsn211e7a31c140";

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-RapidAPI-Key": apiKey, 
            "X-RapidAPI-Host": "instagram-social-api.p.rapidapi.com"
        },
        signal: AbortSignal.timeout?.(10_000)
    })

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[v0] ERRO API EXTERNA: ${response.status} - ${errText}`);
        return NextResponse.json({ success: false, error: "Erro na API externa" }, { status: response.status })
    }

    const data = await response.json()
    
    // Lógica para pegar o usuário da lista
    let items = data.items || data.users || (Array.isArray(data) ? data : [])
    const getUser = (i: any) => i.user || i
    
    // Tenta achar o usuário
    const found = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase())
    const userRaw = found ? getUser(found) : (items[0] ? getUser(items[0]) : null)

    if (!userRaw) {
        console.log("[v0] Usuário não encontrado na lista retornada.");
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Tratamento da Imagem
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || userRaw.profile_pic_url || ""
    let finalProfilePic = ""
    
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
        // Adiciona o seu proxy
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`
    }

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        biography: userRaw.biography || "",
        profile_pic_url: finalProfilePic,
        follower_count: userRaw.follower_count || 0,
        following_count: userRaw.following_count || 0,
        media_count: userRaw.media_count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: ""
    }

    // Salva Cache
    cache.set(cleanUsername, { profile: profileData, timestamp: Date.now() })
    
    return NextResponse.json({ success: true, profile: profileData }, { status: 200 })

  } catch (err: any) {
    console.error("[v0] Erro Fatal:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } })
}
