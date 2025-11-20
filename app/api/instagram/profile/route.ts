import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { profile: any; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username is required" },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    // Remove @ if present
    const cleanUsername = username.replace("@", "")

    // Check cache first
    const cached = cache.get(cleanUsername)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[v0] Returning cached Instagram profile")
      return NextResponse.json(
        {
          success: true,
          profile: cached.profile,
        },
        {
          status: 200,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    // Fetch Instagram profile data using RapidAPI
    const url = `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${cleanUsername}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com",
      },
      signal: AbortSignal.timeout?.(10_000),
    })

    if (response.status === 429) {
      console.log("[v0] Rate limit exceeded for Instagram API")
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    if (!response.ok) {
      console.error("[v0] Instagram API returned status:", response.status)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch Instagram profile",
        },
        {
          status: response.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    const data = await response.json()

    console.log("[v0] Instagram API raw response:", JSON.stringify(data, null, 2))

    if (!data || !data.data) {
      console.log("[v0] Invalid response from Instagram API")
      return NextResponse.json(
        {
          success: false,
          error: "Profile not found",
        },
        {
          status: 404,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    const profileData = {
      username: data.data.username || cleanUsername,
      full_name: data.data.full_name || data.data.fullName || "",
      biography: data.data.biography || data.data.bio || "",
      profile_pic_url: data.data.profile_pic_url || data.data.profile_pic_url_hd || data.data.profilePicUrl || "",
      follower_count: data.data.follower_count || data.data.followerCount || data.data.edge_followed_by?.count || 0,
      following_count: data.data.following_count || data.data.followingCount || data.data.edge_follow?.count || 0,
      media_count: data.data.media_count || data.data.mediaCount || data.data.edge_owner_to_timeline_media?.count || 0,
      is_private: data.data.is_private || data.data.isPrivate || false,
      is_verified: data.data.is_verified || data.data.isVerified || false,
      category: data.data.category || "",
    }

    console.log("[v0] Extracted profile data:", JSON.stringify(profileData, null, 2))

    // Cache the result
    cache.set(cleanUsername, {
      profile: profileData,
      timestamp: Date.now(),
    })

    // Clean up old cache entries
    if (cache.size > 100) {
      const oldestKey = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0]
      cache.delete(oldestKey)
    }

    return NextResponse.json(
      {
        success: true,
        profile: profileData,
      },
      {
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    )
  } catch (err) {
    console.error("[v0] Error fetching Instagram profile:", err)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    )
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
