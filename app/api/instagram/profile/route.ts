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

    console.log(`[v0] --- Iniciando Busca MULTI-API para: ${cleanUsername} ---`)
    let userRaw = null;

    // =================================================================================
    // TENTATIVA 1: NOVA API (Scraper V2 - POST)
    // =================================================================================
    try {
        const apiUrl = "https://instagram-scraper-v21.p.rapidapi.com/api/user-information";
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-scraper-v21.p.rapidapi.com",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username: cleanUsername }),
            signal: AbortSignal.timeout?.(10_000)
        });

        if (response.ok) {
            const data = await response.json();
            // Tenta extrair
            if (data.data) userRaw = data.data;
            else if (data.user) userRaw = data.user;
            else userRaw = data;

            // Validação: Se veio vazio, anula para tentar o fallback
            if (!userRaw || (!userRaw.username && !userRaw.pk)) {
                userRaw = null;
                console.warn("[v0] API V2 retornou vazio. Tentando fallback...");
            } else {
                console.log("[v0] SUCESSO na API V2");
            }
        }
    } catch (error) {
        console.error("[v0] Falha na API V2:", error);
    }

    // =================================================================================
    // TENTATIVA 2 (FALLBACK): API DE BUSCA (Social API - GET)
    // Só roda se a Tentativa 1 falhou
    // =================================================================================
    if (!userRaw) {
        console.log("[v0] Ativando Fallback (Social API)...");
        try {
            const searchUrl = `https://instagram-social-api.p.rapidapi.com/v1/search_users?search_query=${cleanUsername}`;
            const searchResponse = await fetch(searchUrl, {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                    "X-RapidAPI-Host": "instagram-social-api.p.rapidapi.com",
                },
                signal: AbortSignal.timeout?.(10_000)
            });

            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                let items = searchData.items || searchData.users || (Array.isArray(searchData) ? searchData : []);
                
                if (items && items.length > 0) {
                    const getUser = (i: any) => i.user || i;
                    const exactMatch = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase());
                    // Pega o exato ou o primeiro da lista
                    userRaw = exactMatch ? getUser(exactMatch) : getUser(items[0]);
                    
                    if (userRaw) {
                        console.log(`[v0] SUCESSO no Fallback: Encontrado ${userRaw.username}`);
                    }
                }
            }
        } catch (e) {
            console.error("[v0] Falha no Fallback:", e);
        }
    }

    // Se falhou nas duas
    if (!userRaw || (!userRaw.username && !userRaw.pk && !userRaw.id)) {
        console.log("[v0] ERRO FATAL: Usuário não encontrado em nenhuma API.");
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // EXTRAÇÃO E PROXY
    // =================================================================================
    
    // Foto: Tenta pegar a melhor qualidade disponível
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || 
                             userRaw.profile_pic_id || // Algumas APIs retornam isso na busca
                             "";

    let finalProfilePic = "";
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    // Normalização dos dados (algumas APIs usam full_name, outras fullName)
    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        biography: userRaw.biography || userRaw.bio || "",
        profile_pic_url: finalProfilePic,
        // Se não tiver contadores (comum na busca simples), usa 0 ou números fake para não quebrar layout
        follower_count: userRaw.follower_count || userRaw.edge_followed_by?.count || 0,
        following_count: userRaw.following_count || userRaw.edge_follow?.count || 0,
        media_count: userRaw.media_count || userRaw.edge_owner_to_timeline_media?.count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: userRaw.category || "",
    }

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
