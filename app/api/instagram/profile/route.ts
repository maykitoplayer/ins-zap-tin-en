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

    const rapidapiKey = process.env.INSTAGRAM_RAPIDAPI_KEY || ""

    console.log("[v0] Step 1: Getting user ID for username:", cleanUsername)
    const userIdResponse = await fetch("https://instagram-media-api.p.rapidapi.com/user/id", {
      method: "POST",
      headers: {
        "x-rapidapi-key": rapidapiKey,
        "x-rapidapi-host": "instagram-media-api.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: cleanUsername,
        proxy: "",
      }),
    })

    const userIdText = await userIdResponse.text()
    console.log("[v0] User ID API response status:", userIdResponse.status)
    console.log("[v0] User ID API response full:", userIdText)

    let userIdData
    try {
      userIdData = JSON.parse(userIdText)
    } catch (e) {
      console.error("[v0] Failed to parse user ID response:", e)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to get user ID",
        },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    if (!userIdResponse.ok) {
      console.error("[v0] User ID API error - Status:", userIdResponse.status)
      console.error("[v0] User ID API error - Full response:", userIdText)
      return NextResponse.json(
        {
          success: false,
          error: userIdData?.message || "Failed to get user ID",
        },
        {
          status: userIdResponse.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    const userId =
      userIdData.id || userIdData.user_id || userIdData.userId || userIdData.data?.id || userIdData.data?.user_id
    console.log("[v0] Extracted user ID:", userId, "from response:", JSON.stringify(userIdData, null, 2))

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not extract user ID from response",
        },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    console.log("[v0] Step 2: Getting profile info for user ID:", userId)
    const profileResponse = await fetch("https://instagram-media-api.p.rapidapi.com/user/info", {
      method: "POST",
      headers: {
        "x-rapidapi-key": rapidapiKey,
        "x-rapidapi-host": "instagram-media-api.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userid: userId,
        proxy: "",
      }),
    })

    const profileText = await profileResponse.text()
    console.log("[v0] Profile API response:", profileText.substring(0, 500))

    let profileData
    try {
      profileData = JSON.parse(profileText)
    } catch (e) {
      console.error("[v0] Failed to parse profile response:", e)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse profile data",
        },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    if (!profileResponse.ok) {
      console.error("[v0] Profile API error:", profileData)
      return NextResponse.json(
        {
          success: false,
          error: profileData?.message || "Failed to fetch profile",
        },
        {
          status: profileResponse.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        },
      )
    }

    const user = profileData.user || profileData.data || profileData
    console.log("[v0] User data extracted:", JSON.stringify(user, null, 2))

    const extractedProfile = {
      username: user.username || cleanUsername,
      full_name: user.full_name || user.fullName || user.name || "",
      biography: user.biography || user.bio || user.about || "",
      profile_pic_url: user.profile_pic_url || user.profile_picture_url || user.profilePictureUrl || user.pic || "",
      follower_count: user.follower_count || user.followers || user.follower || 0,
      following_count: user.following_count || user.following || 0,
      media_count: user.media_count || user.posts || user.post_count || 0,
      is_private: user.is_private || user.private || false,
      is_verified: user.is_verified || user.verified || false,
      pk: user.pk || user.id || userId,
    }

    console.log("[v0] Final extracted profile:", JSON.stringify(extractedProfile, null, 2))

    // Cache the result
    cache.set(cleanUsername, {
      profile: extractedProfile,
      timestamp: Date.now(),
    })

    return NextResponse.json(
      {
        success: true,
        profile: extractedProfile,
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
