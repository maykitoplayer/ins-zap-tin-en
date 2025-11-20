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

    console.log(`[v0] --- Iniciando busca HÍBRIDA para: ${cleanUsername} ---`)
    let userId = null;
    let fallbackData = null;

    // =================================================================================
    // PASSO 1: OBTER ID (Voltar para a SOCIAL API / BUSCA)
    // Motivo: Ela é mais garantida para achar o usuário do que a endpoint /user/id
    // =================================================================================
    try {
        // console.log("[v0] Tentando obter ID via Social API (Busca)...");
        const searchUrl = `https://instagram-social-api.p.rapidapi.com/v1/search_users?search_query=${cleanUsername}`;
        
        const searchResponse = await fetch(searchUrl, {
            method: "GET",
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-social-api.p.rapidapi.com", // Usando a Social para achar o ID
            },
            signal: AbortSignal.timeout?.(10_000)
        });

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            
            // Lógica de extração da lista
            let items = searchData.items || searchData.users || (Array.isArray(searchData) ? searchData : []);
            
            if (items && items.length > 0) {
                const getUser = (i: any) => i.user || i;
                
                // Tenta match exato
                const exactMatch = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase());
                // Se não achar exato, pega o primeiro
                const bestMatch = exactMatch ? getUser(exactMatch) : getUser(items[0]);

                if (bestMatch) {
                    userId = bestMatch.pk || bestMatch.id;
                    fallbackData = bestMatch; // Guarda dados básicos caso o passo 2 falhe
                    console.log(`[v0] ID encontrado (Social API): ${userId}`);
                }
            }
        }
    } catch (e) {
        console.error("[v0] Falha na busca Social API:", e);
    }

    // TENTATIVA 2: Se a Social falhou, tenta a Media API /user/id (Fallback)
    if (!userId) {
        try {
             // console.log("[v0] Social falhou, tentando Media API /user/id...");
             const idUrl = "https://instagram-media-api.p.rapidapi.com/user/id";
             const idResponse = await fetch(idUrl, {
                method: "POST",
                headers: {
                    "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                    "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username: cleanUsername, proxy: "" }),
                signal: AbortSignal.timeout?.(8_000)
            });
            if (idResponse.ok) {
                const idData = await idResponse.json();
                userId = idData.response || idData.user_id || idData.id || idData.data?.id;
                console.log(`[v0] ID encontrado (Media API): ${userId}`);
            }
        } catch(e) {
            console.error("[v0] Falha na busca Media API:", e);
        }
    }

    if (!userId) {
        console.log("[v0] ERRO FINAL: Usuário não encontrado em nenhuma API.");
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // PASSO 2: OBTER DETALHES (Media API /user/info)
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
            
            // Estratégia de extração "Caça-Dados"
            if (data.user) userRaw = data.user;
            else if (data.data && data.data.user) userRaw = data.data.user;
            else if (data.response && data.response.user) userRaw = data.response.user;
            else userRaw = data; // Tenta raiz
        } 
    } catch (error) {
        console.error("[v0] Erro Passo 2:", error);
    }

    // Se o Passo 2 falhou (veio vazio ou erro), usa os dados do Passo 1 (Fallback)
    if (!userRaw || (!userRaw.username && !userRaw.pk)) {
        console.log("[v0] Usando dados de Fallback (Busca inicial)");
        userRaw = fallbackData;
    }

    if (!userRaw) {
         return NextResponse.json({ success: false, error: "Profile data unavailable" }, { status: 404 });
    }

    // =================================================================================
    // EXTRAÇÃO DE DADOS E PROXY
    // =================================================================================
    
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || 
                             userRaw.profile_pic_id || 
                             "";

    let finalProfilePic = "";
    
    // AQUI ESTA A CORREÇÃO: Só adiciona o proxy UMA vez aqui no backend
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
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
