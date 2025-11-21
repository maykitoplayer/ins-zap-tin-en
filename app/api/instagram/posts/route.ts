import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    console.log("[v0] Fetching Instagram posts for:", username)

    if (!username) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 })
    }

    const rapidApiKey = process.env.INSTAGRAM_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY

    if (!rapidApiKey) {
      console.error("[v0] API Key not found")
      return NextResponse.json({ success: false, error: "API key not configured" }, { status: 500 })
    }

    const url = "https://instagram120.p.rapidapi.com/api/instagram/posts"
    const options = {
      method: "POST",
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": "instagram120.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        maxId: "",
      }),
    }

    console.log("[v0] Making API request to fetch posts...")

    const response = await fetch(url, options)
    const result = await response.json()

    console.log("[v0] Posts API response status:", response.status)
    console.log("[v0] Posts API response:", JSON.stringify(result).substring(0, 500))

    if (!response.ok) {
      console.error("[v0] Posts API error:", result)
      return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: response.status })
    }

    // Extract posts from the response
    let posts = []

    // Try to extract posts from various possible response structures
    if (result.result && result.result.edges && Array.isArray(result.result.edges)) {
      // Instagram120 API structure
      posts = result.result.edges.map((edge: any) => {
        const node = edge.node
        return {
          id: node.id || node.pk,
          imageUrl: node.image_versions2?.candidates?.[0]?.url || node.display_url || "",
          caption: node.caption?.text || "",
          likes: node.like_count || 0,
          comments: node.comment_count || 0,
          timestamp: node.taken_at,
          code: node.code,
        }
      })
    } else if (result.data && result.data.user && result.data.user.edge_owner_to_timeline_media) {
      // Instagram Graph API structure
      const edges = result.data.user.edge_owner_to_timeline_media.edges
      posts = edges.map((edge: any) => ({
        id: edge.node.id,
        imageUrl: edge.node.display_url,
        caption: edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || "",
        likes: edge.node.edge_liked_by?.count || 0,
        comments: edge.node.edge_media_to_comment?.count || 0,
      }))
    } else if (result.data && Array.isArray(result.data)) {
      posts = result.data
    } else if (result.items && Array.isArray(result.items)) {
      posts = result.items
    } else if (Array.isArray(result)) {
      posts = result
    }

    console.log("[v0] Extracted", posts.length, "posts")
    if (posts.length > 0) {
      console.log("[v0] First post sample:", JSON.stringify(posts[0]).substring(0, 200))
    }

    return NextResponse.json({ success: true, posts: posts })
  } catch (error: any) {
    console.error("[v0] Error fetching Instagram posts:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
