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

    console.log(`[v0] Iniciando busca para: ${cleanUsername}`)
    let userId = null;

    // =================================================================================
    // PASSO 1: OBTER ID
    // =================================================================================
    try {
        const idUrl = "https://instagram-media-api.p.rapidapi.com/user/id";
        const idResponse = await fetch(idUrl, {
            method: "POST",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: cleanUsername, proxy: "" }),
            signal: AbortSignal.timeout?.(10_000)
        });

        if (idResponse.ok) {
            const idData = await idResponse.json();
            userId = idData.response || idData.user_id || idData.id || idData.data?.id || idData.pk;
            console.log(`[v0] Passo 1: ID encontrado -> ${userId}`);
        } else {
            console.error(`[v0] Erro Passo 1: Status ${idResponse.status}`);
        }
    } catch (e) {
        console.error("[v0] Erro Passo 1:", e);
    }

    if (!userId) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // PASSO 2: OBTER DETALHES
    // =================================================================================
    let userRaw = null;

    try {
        const infoUrl = "https://instagram-media-api.p.rapidapi.com/user/info/";
        const infoResponse = await fetch(infoUrl, {
            method: "POST",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userid: String(userId), proxy: "" }),
            signal: AbortSignal.timeout?.(15_000)
        });

        if (infoResponse.ok) {
            const data = await infoResponse.json();
            
            // Estratégia de extração robusta
            if (data.user) userRaw = data.user;
            else if (data.data && data.data.user) userRaw = data.data.user;
            else if (data.response && data.response.user) userRaw = data.response.user;
            else userRaw = data;

        } else {
            console.error(`[v0] Erro Passo 2: Status ${infoResponse.status}`);
        }
    } catch (error) {
        console.error("[v0] Erro Passo 2:", error);
    }

    if (!userRaw) {
         return NextResponse.json({ success: false, error: "Profile data unavailable" }, { status: 404 });
    }

    // =================================================================================
    // EXTRAÇÃO DE DADOS
    // =================================================================================
    
    // 1. Foto de Perfil
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || 
                             userRaw.profile_pic_id || 
                             "";

    let finalProfilePic = "";
    // AQUI A MÁGICA: O backend gera o link do proxy
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
        // Se estiver rodando local ou prod, o caminho relativo funciona
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    // 2. Biografia (Tenta vários campos)
    const biography = userRaw.biography || userRaw.bio || userRaw.description || "";

    // 3. Números
    const followers = userRaw.follower_count || userRaw.edge_followed_by?.count || 0;
    const following = userRaw.following_count || userRaw.edge_follow?.count || 0;
    const media = userRaw.media_count || userRaw.edge_owner_to_timeline_media?.count || 0;
    const fullName = userRaw.full_name || userRaw.fullName || "";

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: fullName,
        biography: biography,
        profile_pic_url: finalProfilePic, // Retorna a URL já "proxied"
        follower_count: followers,
        following_count: following,
        media_count: media,
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
