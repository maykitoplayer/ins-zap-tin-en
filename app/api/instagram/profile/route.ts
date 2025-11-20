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

    // 1. Verificar Cache (Economiza créditos)
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[v0] Returning cached Instagram profile")
      return NextResponse.json({ success: true, profile: cached.profile }, { status: 200 })
    }

    console.log(`[v0] Iniciando busca para: ${cleanUsername}`)
    
    // =================================================================================
    // PASSO 1: Converter Username em ID (Usando a API de Busca / Social API)
    // =================================================================================
    let userId = null;
    let searchFallbackData = null; // Caso a API principal falhe, usamos dados da busca

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
            
            // Lógica para achar o ID na lista
            let items = searchData.items || searchData.users || (Array.isArray(searchData) ? searchData : []);
            const getUser = (i: any) => i.user || i;
            
            // Procura match exato
            const found = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase());
            const bestMatch = found ? getUser(found) : (items.length > 0 ? getUser(items[0]) : null);

            if (bestMatch) {
                userId = bestMatch.pk || bestMatch.id; // O ID numérico (Ex: 62015806293)
                searchFallbackData = bestMatch; // Guarda dados básicos caso o passo 2 falhe
                console.log(`[v0] ID encontrado: ${userId}`);
            }
        }
    } catch (e) {
        console.warn("[v0] Erro ao buscar ID:", e);
    }

    if (!userId) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // =================================================================================
    // PASSO 2: Usar a SUA NOVA API com o ID (userInfoProfile)
    // =================================================================================
    let userRaw = null;

    try {
        console.log(`[v0] Buscando detalhes completos na nova API para ID: ${userId}...`);

        const newApiUrl = "https://instagram-media-api.p.rapidapi.com/user/info/";
        const newApiResponse = await fetch(newApiUrl, {
            method: "POST", // A sua nova API exige POST
            headers: {
                "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
                "X-RapidAPI-Host": "instagram-media-api.p.rapidapi.com", // HOST DA NOVA API
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userid: String(userId), // Envia o ID que descobrimos no passo 1
                proxy: "" // Campo exigido pela sua nova API
            }),
            signal: AbortSignal.timeout?.(15_000)
        });

        if (newApiResponse.ok) {
            const data = await newApiResponse.json();
            // Tenta extrair o usuário da resposta (ajuste conforme o retorno da API)
            userRaw = data.data || data.user || data;
        } else {
            console.warn(`[v0] Nova API falhou (Status ${newApiResponse.status}), usando dados de fallback.`);
        }

    } catch (error) {
        console.error("[v0] Erro na nova API:", error);
    }

    // Se a API nova falhou, usa os dados da busca (Search API) como fallback
    if (!userRaw || (!userRaw.username && !userRaw.pk)) {
        userRaw = searchFallbackData;
    }

    if (!userRaw) {
         return NextResponse.json({ success: false, error: "Profile data unavailable" }, { status: 404 });
    }

    // =================================================================================
    // PASSO 3: Montar e Retornar os Dados
    // =================================================================================
    
    // Extração de Imagem
    const originalImageUrl = userRaw.hd_profile_pic_url_info?.url || 
                             userRaw.profile_pic_url_hd || 
                             userRaw.profile_pic_url || "";

    // Aplica o Proxy
    let finalProfilePic = "";
    if (originalImageUrl && originalImageUrl.startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        biography: userRaw.biography || userRaw.bio || "",
        profile_pic_url: finalProfilePic,
        // A nova API deve retornar os contadores corretos
        follower_count: userRaw.follower_count || userRaw.edge_followed_by?.count || 0,
        following_count: userRaw.following_count || userRaw.edge_follow?.count || 0,
        media_count: userRaw.media_count || userRaw.edge_owner_to_timeline_media?.count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: userRaw.category || "",
    }

    // Salva no cache
    cache.set(cleanUsername, { profile: profileData, timestamp: Date.now() });

    return NextResponse.json({ success: true, profile: profileData }, { status: 200 });

  } catch (err) {
    console.error("[v0] Server Error:", err)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}
