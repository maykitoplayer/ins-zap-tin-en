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
    const url = "https://instagram-media-api.p.rapidapi.com/user/id"

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-rapidapi-key": process.env.INSTAGRAM_RAPIDAPI_KEY || "",
        "x-rapidapi-host": "instagram-media-api.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: cleanUsername,
        proxy: "",
      }),
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

    if (!data || !data.pk) {
      console.log("[v0] Invalid response from Instagram API - no pk field")
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
      username: data.username || cleanUsername,
      full_name: data.full_name || "",
      biography: data.biography || "",
      profile_pic_url: data.profile_pic_url || data.profile_picture_url || "",
      follower_count: data.follower_count || 0,
      following_count: data.following_count || 0,
      media_count: data.media_count || 0,
      is_private: data.is_private || false,
      is_verified: data.is_verified || false,
      category: data.category || "",
      pk: data.pk,
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
