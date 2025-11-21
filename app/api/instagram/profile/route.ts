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

    const url = "https://instagram-scraper-v21.p.rapidapi.com/api/get-user-info"
    const rapidapiKey = process.env.INSTAGRAM_RAPIDAPI_KEY || ""

    console.log("[v0] Calling Instagram API with username:", cleanUsername)
    console.log("[v0] API URL:", url)
    console.log("[v0] API Key available:", !!rapidapiKey)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-rapidapi-key": rapidapiKey,
        "x-rapidapi-host": "instagram-scraper-v21.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: cleanUsername,
      }),
    })

    console.log("[v0] Instagram API response status:", response.status)
    console.log("[v0] Response headers:", Object.fromEntries(response.headers))

    // Get response text first to see what we're dealing with
    const responseText = await response.text()
    console.log("[v0] Instagram API raw response text:", responseText.substring(0, 500))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("[v0] Failed to parse API response as JSON:", e)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from Instagram API",
        },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

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
      console.error("[v0] Instagram API error response:", data)
      return NextResponse.json(
        {
          success: false,
          error: data?.message || "Failed to fetch Instagram profile",
        },
        {
          status: response.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    console.log("[v0] Instagram API response data:", JSON.stringify(data, null, 2))

    // Check for success in different response formats
    if (!data || (!data.user && !data.data)) {
      console.log("[v0] Invalid response structure - expected user or data field")
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

    const user = data.user || data.data
    const profileData = {
      username: user.username || cleanUsername,
      full_name: user.full_name || user.fullName || "",
      biography: user.biography || user.bio || "",
      profile_pic_url: user.profile_pic_url || user.profile_picture_url || user.profilePictureUrl || "",
      follower_count: user.follower_count || user.followers || 0,
      following_count: user.following_count || user.following || 0,
      media_count: user.media_count || user.posts || 0,
      is_private: user.is_private || user.private || false,
      is_verified: user.is_verified || user.verified || false,
      pk: user.pk || user.id || "",
    }

    console.log("[v0] Extracted profile data:", JSON.stringify(profileData, null, 2))

    // Cache the result
    cache.set(cleanUsername, {
      profile: profileData,
      timestamp: Date.now(),
    })

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
        error: err instanceof Error ? err.message : "Internal server error",
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
