import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 })
    }

    const cleanUsername = username.replace("@", "").trim()

    // 1. Verifica Cache
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[v0] Returning cached Instagram profile")
      return NextResponse.json({ success: true, profile: cached.profile }, { status: 200 })
    }

    console.log(`[v0] Iniciando busca para: ${cleanUsername} (Usando apenas Media API)`)

    let userId = null;

    // =================================================================================
    // PASSO 1: OBTER ID PELO USERNAME (getUserIdByUsername)
    // =================================================================================
    try {
        const idUrl = "https://instagram-media-api.p.rapidapi.com/user/id";
        const idResponse = await fetch(idUrl, {
            method: "POST",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com", // Mesma API para tudo
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: cleanUsername,
                proxy: ""
            }),
            signal: AbortSignal.timeout?.(10_000)
        });

        if (idResponse.ok) {
            const idData = await idResponse.json();
            // A resposta geralmente vem como { "response": "12345..." } ou { "user_id": 123... }
            // Ajustamos para pegar o ID onde quer que ele venha
            userId = idData.response || idData.user_id || idData.id || idData.data?.id;
            
            console.log(`[v0] Passo 1: ID encontrado -> ${userId}`);
        } else {
            console.error(`[v0] Erro ao pegar ID: ${idResponse.status}`);
        }
    } catch (e) {
        console.error("[v0] Erro de conexão no Passo 1:", e);
    }

    if (!userId) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // PASSO 2: OBTER DETALHES PELO ID (userInfoProfile)
    // =================================================================================
    let userRaw = null;

    try {
        const infoUrl = "https://instagram-media-api.p.rapidapi.com/user/info/";
        const infoResponse = await fetch(infoUrl, {
            method: "POST",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com", // Mesma API
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userid: String(userId), // O ID que pegamos no passo 1
                proxy: ""
            }),
            signal: AbortSignal.timeout?.(15_000)
        });

        if (infoResponse.ok) {
            const data = await infoResponse.json();
            userRaw = data.data || data.user || data;
            console.log("[v0] Passo 2: Detalhes recebidos com sucesso.");
        } else {
            console.error(`[v0] Erro ao pegar detalhes: ${infoResponse.status}`);
        }

    } catch (error) {
        console.error("[v0] Erro de conexão no Passo 2:", error);
    }

    if (!userRaw) {
         return NextResponse.json({ success: false, error: "Profile data unavailable" }, { status: 404 });
    }

    // =================================================================================
    // MONTAGEM DA RESPOSTA
    // =================================================================================
    
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || "";

    let finalProfilePic = "";
    if (originalImageUrl && originalImageUrl.startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        biography: userRaw.biography || userRaw.bio || "",
        profile_pic_url: finalProfilePic,
        follower_count: userRaw.follower_count || userRaw.edge_followed_by?.count || 0,
        following_count: userRaw.following_count || userRaw.edge_follow?.count || 0,
        media_count: userRaw.media_count || userRaw.edge_owner_to_timeline_media?.count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: userRaw.category || "",
    }

    // Cache
    cache.set(cleanUsername, { profile: profileData, timestamp: Date.now() });

    return NextResponse.json({ success: true, profile: profileData }, { status: 200 });

  } catch (err) {
    console.error("[v0] Erro Geral:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}
