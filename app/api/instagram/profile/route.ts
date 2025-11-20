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

    console.log(`[v0] Iniciando busca (Scraper V2 - POST) para: ${cleanUsername}`)

    // =================================================================================
    // CONFIGURAÇÃO DA API (Conforme sua imagem)
    // =================================================================================
    const apiUrl = "https://instagram-scraper-v21.p.rapidapi.com/api/user-information"; // URL da imagem

    let userRaw = null;

    try {
        const response = await fetch(apiUrl, {
            method: "POST", // Método da imagem
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-scraper-v21.p.rapidapi.com", // Host da imagem
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: cleanUsername // Body da imagem
            }),
            signal: AbortSignal.timeout?.(15_000)
        });

        if (response.ok) {
            const data = await response.json();
            
            // console.log("[v0] Resposta JSON:", JSON.stringify(data).substring(0, 200));

            // Extração de dados (tenta achar onde o usuário está)
            if (data.data) userRaw = data.data;
            else if (data.user) userRaw = data.user;
            else userRaw = data;

            console.log("[v0] Sucesso: Dados recebidos.");
        } else {
            console.error(`[v0] Erro na API: ${response.status}`);
        }

    } catch (error) {
        console.error("[v0] Erro de conexão:", error);
    }

    // Se não encontrou dados, retorna 404
    if (!userRaw || (!userRaw.username && !userRaw.pk && !userRaw.id)) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // MONTAGEM DA RESPOSTA
    // =================================================================================
    
    // 1. Foto de Perfil (Procura a melhor qualidade)
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || 
                             "";

    let finalProfilePic = "";
    
    // 2. Adiciona o Proxy (ESSENCIAL)
    // Transforma o link do Instagram em link do seu site para não quebrar
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        biography: userRaw.biography || userRaw.bio || "",
        profile_pic_url: finalProfilePic, // Manda a URL já processada
        follower_count: userRaw.follower_count || userRaw.edge_followed_by?.count || 0,
        following_count: userRaw.following_count || userRaw.edge_follow?.count || 0,
        media_count: userRaw.media_count || userRaw.edge_owner_to_timeline_media?.count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: userRaw.category || "",
    }

    // Salva no Cache
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
