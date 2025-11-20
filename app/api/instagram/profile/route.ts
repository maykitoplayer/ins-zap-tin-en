import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutos

export async function POST(request: NextRequest) {
  try {
    // 1. Recebe o username do Frontend
    const { username } = await request.json()
    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 })

    const cleanUsername = username.replace("@", "").trim()

    // 2. Verifica se já temos no cache (pra ser rápido)
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, profile: cached.profile }, { status: 200 })
    }

    console.log(`[v0] Usando Social API para buscar: ${cleanUsername}`)

    // ========================================================================
    // IMPLEMENTAÇÃO DO SEU SNIPPET
    // ========================================================================
    const url = `https://instagram-social-api.p.rapidapi.com/v1/search_users?search_query=${cleanUsername}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            // Usa a chave do ambiente (que você vai atualizar para a 'de5a...')
            'x-rapidapi-key': process.env.INSTAGRAM_RAPIDAPI_KEY || "",
            'x-rapidapi-host': 'instagram-social-api.p.rapidapi.com'
        },
        signal: AbortSignal.timeout?.(10_000) // Timeout de 10s pra não travar
    });

    if (!response.ok) {
        console.error(`[v0] Erro na API: ${response.status}`);
        return NextResponse.json({ success: false, error: "Erro na API externa" }, { status: response.status });
    }

    const data = await response.json();

    // ========================================================================
    // LÓGICA PARA ENCONTRAR O USUÁRIO NA LISTA
    // ========================================================================
    let userRaw = null;
    
    // Essa API retorna uma lista em 'items' ou 'users'
    const items = data.items || data.users || [];

    if (Array.isArray(items) && items.length > 0) {
        const getUser = (i: any) => i.user || i;
        
        // 1. Tenta achar o nome EXATO
        const exactMatch = items.find((i: any) => getUser(i).username?.toLowerCase() === cleanUsername.toLowerCase());
        
        // 2. Se não achar exato, pega o PRIMEIRO da lista (melhor que dar erro)
        userRaw = exactMatch ? getUser(exactMatch) : getUser(items[0]);
    }

    if (!userRaw) {
        console.log("[v0] Usuário não encontrado na lista da busca.");
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // ========================================================================
    // TRATAMENTO DA IMAGEM (PROXY)
    // ========================================================================
    const originalImageUrl = userRaw.profile_pic_url || userRaw.hd_profile_pic_url_info?.url || "";
    
    let finalProfilePic = "";
    // Adiciona o proxy para a imagem não quebrar no site
    if (originalImageUrl && String(originalImageUrl).startsWith("http")) {
        finalProfilePic = `/api/instagram/image?url=${encodeURIComponent(originalImageUrl)}`;
    }

    // ========================================================================
    // MONTAGEM DO PERFIL
    // ========================================================================
    const profileData = {
        username: userRaw.username || cleanUsername,
        full_name: userRaw.full_name || userRaw.fullName || "",
        // Essa API de busca as vezes não traz bio/seguidores, então usamos "" ou 0 para não quebrar
        biography: userRaw.biography || "", 
        profile_pic_url: finalProfilePic,
        follower_count: userRaw.follower_count || 0,
        following_count: userRaw.following_count || 0,
        media_count: userRaw.media_count || 0,
        is_private: userRaw.is_private || false,
        is_verified: userRaw.is_verified || false,
        category: ""
    }

    // Salva no cache
    cache.set(cleanUsername, { profile: profileData, timestamp: Date.now() })

    console.log(`[v0] Sucesso! Encontrado: ${profileData.username}`);
    return NextResponse.json({ success: true, profile: profileData }, { status: 200 })

  } catch (error: any) {
    console.error("[v0] Erro Fatal:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  })
}
