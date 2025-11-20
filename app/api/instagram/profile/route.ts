import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) return NextResponse.json({ error: "No username" }, { status: 400 })

    const cleanUsername = username.replace("@", "").trim()

    // Cache check
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, profile: cached.profile }, { status: 200 })
    }

    console.log(`[v0] Tentando API com a chave correta para: ${cleanUsername}`)

    // Usando a Social API (Busca) que você mostrou no print
    const url = `https://instagram-social-api.p.rapidapi.com/v1/search_users?search_query=${cleanUsername}`
    
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "", // Agora vai pegar a chave certa
            "X-RapidAPI-Host": "instagram-social-api.p.rapidapi.com"
        }
    })

    // LOG DE ERRO REAL (Para sabermos se a chave funcionou)
    if (!response.ok) {
        const errorText = await response.text()
        console.error(`[v0] ERRO RAPIDAPI: ${response.status} - ${errorText}`)
        return NextResponse.json({ success: false, error: `Erro API: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    
    // Lógica para pegar o usuário da lista
    let items = data.items || data.users || (Array.isArray(data) ? data : [])
    const getUser = (i: any) => i.user || i
    const found = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase())
    const userRaw = found ? getUser(found) : (items[0] ? getUser(items[0]) : null)

    if (!userRaw) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Pega a foto
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || userRaw.profile_pic_url || ""
    let finalProfilePic = ""
    if (originalImageUrl && originalImageUrl.startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`
    }

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || "",
        biography: userRaw.biography || "",
        profile_pic_url: finalProfilePic,
        follower_count: userRaw.follower_count || 0,
        following_count: userRaw.following_count || 0,
        media_count: userRaw.media_count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: ""
    }

    cache.set(cleanUsername, { profile: profileData, timestamp: Date.now() })
    return NextResponse.json({ success: true, profile: profileData }, { status: 200 })

  } catch (err: any) {
    console.error("[v0] Erro Crítico:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } })
}
