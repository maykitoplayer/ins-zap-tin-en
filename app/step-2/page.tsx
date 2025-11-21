"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { User, CheckCircle, Heart, MessageCircle, Lock, AlertTriangle, Wifi, LockOpen } from "lucide-react"

// ==========================================================
// DADOS DOS PERFIS E IMAGENS
// ==========================================================
// Perfis que interagem com o alvo
const FEMALE_PROFILES = [
  "@jessy_nutty",
  "@alexis_30",
  "@izes",
  "@maryjane434",
  "@emma.whistle32",
  "@celina_anderson467",
  "@letty.miriah99",
]
const FEMALE_IMAGES = [
  "/images/male/perfil/1.jpg",
  "/images/male/perfil/2.jpg",
  "/images/male/perfil/3.jpg",
  "/images/male/perfil/4.jpg",
  "/images/male/perfil/5.jpg",
  "/images/male/perfil/6.jpg",
  "/images/male/perfil/7.jpg",
  "/images/male/perfil/8.jpg",
  "/images/male/perfil/9.jpg",
]
const MALE_PROFILES = [
  "@john.doe92",
  "@mike_anderson",
  "@chris_williams",
  "@danny.smith",
  "@liam.baker",
  "@noah_carter",
  "@ryan_hills",
]
const MALE_IMAGES = [
  "/images/female/perfil/1.jpg",
  "/images/female/perfil/2.jpg",
  "/images/female/perfil/3.jpg",
  "/images/female/perfil/4.jpg",
  "/images/female/perfil/5.jpg",
  "/images/female/perfil/6.jpg",
  "/images/female/perfil/7.jpg",
  "/images/female/perfil/8.jpeg",
  "/images/female/perfil/9.jpg",
]

// Imagens "interceptadas" (borradas) que o alvo curtiu
const LIKED_BY_MALE_PHOTOS = [
  "/images/male/liked/male-liked-photo-1.jpg",
  "/images/male/liked/male-liked-photo-2.jpeg",
  "/images/male/liked/male-liked-photo-3.jpeg",
]
const LIKED_BY_MALE_STORIES = [
  "/images/male/liked/male-liked-story-1.jpg",
  "/images/male/liked/male-liked-story-2.jpg",
  "/images/male/liked/male-liked-story-3.jpg",
]
const LIKED_BY_FEMALE_PHOTOS = [
  "/images/female/liked/female-liked-photo-1.jpg",
  "/images/female/liked/female-liked-photo-2.jpg",
  "/images/female/liked/female-liked-photo-3.jpg",
]
const LIKED_BY_FEMALE_STORIES = [
  "/images/female/liked/female-liked-story-1.jpg",
  "/images/female/liked/female-liked-story-2.jpg",
  "/images/female/liked/female-liked-story3.jpg",
]

// Array de comentários para a seção "INTERCEPTED"
const INTERCEPTED_COMMENTS = ["Wow, you are very hot 🥰", "🫣😏", "I'm getting horny 🥵", "drives me crazy 😈"]
// ==========================================================

// --- Funções auxiliares ---
const sanitizeUsername = (username: string): string => {
  let u = (username || "").trim()
  if (u.startsWith("@")) u = u.slice(1)
  u = u.toLowerCase()
  return u.replace(/[^a-z0-9._]/g, "")
}
const setProfileLocalCache = (user: string, profile: any) => {
  if (!user || !profile) return
  try {
    const key = "igProfileCacheV1"
    const cache = JSON.parse(localStorage.getItem(key) || "{}") || {}
    cache[user] = { profile, ts: Date.now() }
    localStorage.setItem(key, JSON.stringify(cache))
  } catch (e) {
    console.error("[v0] Erro ao salvar perfil no cache:", e)
  }
}
const getProfileFromCache = (user: string): any | null => {
  try {
    const key = "igProfileCacheV1"
    const cache = JSON.parse(localStorage.getItem(key) || "{}") || {}
    if (cache[user] && cache[user].profile) {
      return cache[user].profile
    }
  } catch (e) {
    console.error("[v0] Erro ao ler o cache do perfil:", e)
  }
  return null
}

const PageHeader = () => (
  <header className="w-full max-w-md mx-auto text-center px-4 pt-12 pb-8">
    <div className="inline-block bg-white p-4 rounded-2xl shadow-lg mb-6">
      <Wifi className="h-10 w-10 text-indigo-500" />
    </div>
    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
      <span role="img" aria-label="magnifying glass">
        🔍
      </span>{" "}
      Help Us Find What They're Hiding
    </h1>
    <p className="text-white">The more details you provide, the deeper we can dig. Everything stays 100% anonymous.</p>
  </header>
)

// --- Componente da Página ---
export default function Step2() {
  const [step, setStep] = useState(1)
  const [instagramHandle, setInstagramHandle] = useState("")
  const [selectedGender, setSelectedGender] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loadingProgress, setLoadingProgress] = useState(0)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const [timeLeft, setTimeLeft] = useState(5 * 60)

  // Estados para armazenar os resultados sorteados
  const [randomizedResults, setRandomizedResults] = useState<
    Array<{ username: string; image: string; type: "like" | "message" }>
  >([])
  const [interceptedImages, setInterceptedImages] = useState<Array<{ image: string; comment: string }>>([])

  // State for Instagram posts grid
  const [instagramPosts, setInstagramPosts] = useState<any[]>([])
  const [visiblePosts, setVisiblePosts] = useState<number>(0)

  // Função para embaralhar e pegar N itens de um array
  const shuffleAndPick = (arr: any[], num: number) => {
    return [...arr].sort(() => 0.5 - Math.random()).slice(0, num)
  }

  // Lógica para sortear os perfis e imagens quando chegar no passo 3
  useEffect(() => {
    if (step === 3) {
      // 1. Sorteia perfis de interação
      let profilesToUse = FEMALE_PROFILES
      let imagesToUse = FEMALE_IMAGES
      if (selectedGender === "female") {
        profilesToUse = MALE_PROFILES
        imagesToUse = MALE_IMAGES
      }
      const randomUsernames = shuffleAndPick(profilesToUse, 3)
      const randomImages = shuffleAndPick(imagesToUse, 3)
      const results = randomUsernames.map((username, index) => ({
        username,
        image: randomImages[index % randomImages.length],
        type: Math.random() > 0.5 ? "like" : "message",
      }))
      setRandomizedResults(results)

      // 2. Sorteia 4 imagens "interceptadas" e 4 comentários
      let allLikedImages = LIKED_BY_MALE_PHOTOS.concat(LIKED_BY_MALE_STORIES)
      if (selectedGender === "female") {
        allLikedImages = LIKED_BY_FEMALE_PHOTOS.concat(LIKED_BY_FEMALE_STORIES)
      }

      const randomLikedImages = shuffleAndPick(allLikedImages, 4)
      const randomComments = shuffleAndPick(INTERCEPTED_COMMENTS, 4)

      const newInterceptedData = randomLikedImages.map((img, index) => ({
        image: img,
        comment: randomComments[index % randomComments.length],
      }))

      setInterceptedImages(newInterceptedData)
    }
  }, [step, selectedGender])

  useEffect(() => {
    if (step === 3 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [step, timeLeft])

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleInstagramChange = (value: string) => {
    setInstagramHandle(value)
    const sanitizedUser = sanitizeUsername(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setError("")
    setProfileData(null)
    setProfileImageUrl(null)

    if (sanitizedUser.length < 3) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceTimer.current = setTimeout(async () => {
      // 1. Checa Cache
      const cachedProfile = getProfileFromCache(sanitizedUser)
      if (cachedProfile) {
        setProfileData(cachedProfile)
        // CORREÇÃO AQUI: Usar a URL direto, pois ela já vem com o proxy do backend
        setProfileImageUrl(cachedProfile.profile_pic_url)
        setIsLoading(false)
        return
      }

      // 2. Busca API
      try {
        const response = await fetch("/api/instagram/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: sanitizedUser }),
        })
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Perfil não encontrado ou privado.")
        }

        const profile = result.profile
        setProfileData(profile)
        setProfileLocalCache(sanitizedUser, profile)

        // CORREÇÃO AQUI: Não adicionar /api/instagram/image de novo
        setProfileImageUrl(profile.profile_pic_url)
      } catch (err: any) {
        setError(err.message)
        setProfileData(null)
      } finally {
        setIsLoading(false)
      }
    }, 1200)
  }

  const handleContinueClick = () => {
    console.log("[v0] Continue button clicked, fetching posts...")

    const fetchPosts = async () => {
      try {
        const cleanUsername = sanitizeUsername(instagramHandle)
        console.log("[v0] Fetching posts for username:", cleanUsername)

        const response = await fetch("/api/instagram/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: cleanUsername }),
        })

        console.log("[v0] Posts fetch response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Posts data received:", data)

          if (data.success && data.posts && data.posts.length > 0) {
            const postsToShow = data.posts.slice(0, 9)
            console.log("[v0] Setting", postsToShow.length, "posts to display")
            setInstagramPosts(postsToShow)
          } else {
            console.log("[v0] No posts found in response")
          }
        } else {
          console.error("[v0] Failed to fetch posts, status:", response.status)
        }
      } catch (error) {
        console.error("[v0] Error fetching Instagram posts:", error)
      }
    }

    fetchPosts()

    setStep(2)
    setLoadingProgress(0)
    setVisiblePosts(0)

    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval)
          return prev
        }
        return prev + Math.random() * 20
      })
    }, 400)

    const postsInterval = setInterval(() => {
      setVisiblePosts((prev) => {
        if (prev >= 9) {
          clearInterval(postsInterval)
          return 9
        }
        console.log("[v0] Showing post number:", prev + 1)
        return prev + 1
      })
    }, 2800) // Show one post every ~2.8 seconds (9 posts in 25 seconds)

    setTimeout(() => {
      setLoadingProgress(100)
      setTimeout(() => {
        setStep(3)
      }, 1000)
    }, 25000) // Changed from 4000 to 25000 (25 seconds)
  }

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    },
    [],
  )

  const renderProfileCard = (profile: any) => (
    <div
      className="p-4 rounded-lg border-2 border-green-500/50 text-white animate-fade-in relative overflow-hidden"
      style={{
        backgroundColor: "rgba(26, 44, 36, 0.9)",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "15px 15px",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 text-left">
          {profileImageUrl ? (
            <img
              src={profileImageUrl || "/placeholder.svg"}
              alt="profile"
              className="w-14 h-14 rounded-full object-cover filter grayscale"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-700 animate-pulse"></div>
          )}
          <div>
            <p className="text-green-400 font-bold text-sm">Instagram Profile Detected</p>
            <p className="font-bold text-lg text-white">@{profile.username}</p>
            <p className="text-gray-400 text-sm">
              {profile.media_count} posts • {profile.follower_count} followers
            </p>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full border-2 border-green-400 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      {profile.biography && (
        <div className="border-t border-green-500/20 mt-3 pt-3 text-left">
          <p className="text-gray-300 text-sm">{profile.biography}</p>
        </div>
      )}
    </div>
  )

  const renderInitialStep = () => (
    <>
      <div className="w-full text-left space-y-3">
        <h3 className="text-lg font-semibold text-gray-800">What gender are they?</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedGender("male")}
            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 ${selectedGender === "male" ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <span className="text-3xl">👱‍♂️</span>
            <span className="font-medium text-sm text-gray-700">Male</span>
          </button>
          <button
            onClick={() => setSelectedGender("female")}
            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 ${selectedGender === "female" ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <span className="text-3xl">👱‍♀️</span>
            <span className="font-medium text-sm text-gray-700">Female</span>
          </button>
          <button
            onClick={() => setSelectedGender("non-binary")}
            className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all duration-200 transform hover:scale-105 ${selectedGender === "non-binary" ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}
          >
            <span className="text-3xl">👱</span>
            <span className="font-medium text-sm text-gray-700">Non-binary</span>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-pink-500"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        <h1 className="text-2xl font-bold text-black tracking-wide">TARGET IDENTIFICATION</h1>
      </div>
      <p className="text-gray-600 !-mt-4 pt-6">Enter the @Instagram username below and perform a quick search.</p>
      <div className="relative w-full">
        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <Input
          type="text"
          placeholder="username"
          autoComplete="off"
          className="w-full bg-white border-2 border-black/20 text-black pl-12 h-14 text-base rounded-lg focus:border-pink-500 focus:ring-pink-500/50 shadow-inner"
          value={instagramHandle}
          onChange={(e) => handleInstagramChange(e.target.value)}
        />
      </div>

      <div className="w-full min-h-[140px] bg-muted">
        {isLoading && (
          <div className="p-4 bg-pink-50 rounded-lg border-2 border-pink-400 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-pink-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-pink-200 rounded w-3/4"></div>
                <div className="h-3 bg-pink-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        )}
        {!isLoading && error && <p className="text-red-600 font-semibold">{error}</p>}
        {!isLoading && profileData && renderProfileCard(profileData)}
      </div>
      <button
        onClick={() => {
          handleContinueClick()
        }}
        disabled={!profileData || isLoading}
        className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
      >
        🔍 Continue Analysis
      </button>
    </>
  )

  const renderLoadingStep = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-black">Analyzing Profile...</h2>
      {profileData && renderProfileCard(profileData)}
      <div className="w-full space-y-3">
        <p className="font-mono text-sm text-gray-700">
          [SCANNING] Cross-referencing databases... ({Math.floor(loadingProgress)}%)
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-pink-500 to-purple-600 h-2.5 rounded-full"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
      </div>

      {instagramPosts.length > 0 && visiblePosts > 0 && (
        <div className="w-full space-y-3 animate-fade-in">
          <p className="font-mono text-xs text-yellow-600 text-center">[STATUS] Searching for connected accounts...</p>
          <div className="grid grid-cols-3 gap-2">
            {instagramPosts.slice(0, visiblePosts).map((post, index) => {
              const imageUrl = post.imageUrl || "/placeholder.svg?height=200&width=200"
              console.log("[v0] Rendering post", index, "with image:", imageUrl)

              return (
                <div
                  key={post.id || post.pk || index}
                  className="aspect-square rounded-lg overflow-hidden bg-gray-200 animate-fade-in"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={`Post ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("[v0] Failed to load image for post", index, "URL:", imageUrl)
                      e.currentTarget.src = "/instagram-post-lifestyle.png"
                    }}
                  />
                </div>
              )
            })}
            {/* Placeholder boxes for posts not yet revealed */}
            {Array.from({ length: 9 - visiblePosts }).map((_, index) => (
              <div key={`placeholder-${index}`} className="aspect-square rounded-lg bg-gray-300 animate-pulse" />
            ))}
          </div>
        </div>
      )}
      {/* Show a message if no posts were fetched */}
      {instagramPosts.length === 0 && visiblePosts > 0 && (
        <div className="w-full text-center">
          <p className="font-mono text-xs text-gray-500">[INFO] Loading posts from Instagram...</p>
        </div>
      )}
      {/* </CHANGE> */}
    </div>
  )

  const renderResultsStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xl">
        <CheckCircle size={24} /> Analysis Complete
      </div>
      {profileData && renderProfileCard(profileData)}
      {randomizedResults.length > 0 && (
        <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg font-mono text-sm text-left">
          <p>
            <span className="text-green-600 font-bold">[SYSTEM_LOG]</span> New activity detected:
          </p>
          <p className="ml-4">
            <span className="text-blue-600">[INSTAGRAM]</span> {randomizedResults[0].username} liked your photo.
          </p>
          <p className="ml-4">
            <span className="text-blue-600">[INSTAGRAM]</span> New message from{" "}
            {randomizedResults[1]?.username || randomizedResults[0].username}.
          </p>
        </div>
      )}
      <div className="space-y-3 text-left">
        {randomizedResults.length >= 3 && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <img
                  src={randomizedResults[i].image || "/placeholder.svg"}
                  alt="User Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 text-sm">
                  <p className="text-gray-800">
                    <span className="font-semibold">{randomizedResults[i].username}</span>{" "}
                    {i < 2 ? "liked your photo" : "sent you a message"}
                  </p>
                  <p className="text-gray-500 text-xs">{[1, 2, 5][i]} minutes ago</p>
                </div>
                {i < 2 ? (
                  <Heart className="text-pink-500" size={20} />
                ) : (
                  <MessageCircle className="text-blue-500" size={20} />
                )}
              </div>
            ))}
          </>
        )}
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <img src={profileImageUrl || ""} alt="Target Avatar" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1 text-sm">
            <p className="text-gray-800">
              <span className="font-semibold">{instagramHandle}</span> is typing...
            </p>
            <p className="text-gray-500 text-xs">Just now</p>
          </div>
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse ml-auto"></span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
          <img src={profileImageUrl || ""} alt="Target Avatar" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex-1 text-sm">
            <p className="text-gray-800">
              <span className="font-semibold">{instagramHandle}</span> sent a new message.
            </p>
            <p className="text-gray-500 text-xs">1 minute ago</p>
          </div>
          <MessageCircle className="text-blue-500 ml-auto" size={20} />
        </div>
      </div>
      <div className="space-y-5 text-left">
        <h2 className="text-xl font-bold text-black text-center">
          <span className="text-red-600">INTERCEPTED:</span> Suspicious Likes from {instagramHandle}
        </h2>
        {interceptedImages.map((item, index) => (
          <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="relative w-full h-56 rounded-md overflow-hidden">
              <img
                src={item.image || "/placeholder.svg"}
                alt={`Liked content ${index + 1}`}
                className="w-full h-full object-cover filter blur-sm"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Lock size={40} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Heart size={16} className="text-pink-500" />
              <span className="text-sm text-gray-600">{index % 2 === 0 ? "1.2K" : "876"} likes</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <img src={profileImageUrl || ""} alt="User" className="w-8 h-8 rounded-full object-cover" />
              <p className="text-sm text-gray-800">
                <b>{instagramHandle}</b> {item.comment}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white p-5 rounded-lg shadow-xl text-center mt-8">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center mb-4">
          <LockOpen className="text-white" size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">
          <span className="text-yellow-600">🔓</span> UNLOCK COMPLETE REPORT
        </h2>
        <p className="text-gray-600 mt-1 mb-6">
          Get instant access to the full report with uncensored photos and complete conversation history.
        </p>
        <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mt-5">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="text-red-600" />
            <h3 className="font-bold">THE REPORT WILL BE DELETED IN:</h3>
          </div>
          <p className="text-4xl font-mono font-bold my-1 text-red-600">{formatTime(timeLeft)}</p>
          <p className="text-xs text-red-700">
            After the time expires, this report will be permanently deleted for privacy reasons. This offer cannot be
            recovered at a later date.
          </p>
        </div>

        {/* --- MAIN BUTTON AND PRICE --- */}
        <a
          href="https://pay.hotmart.com/P102903672F?checkoutMode=10"
          className="mt-6 block w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          🔓 YES, I WANT THE COMPLETE REPORT
        </a>
        <div className="mt-4 text-center">
          <p className="text-gray-500">
            From <span className="line-through">$79</span> for only
          </p>
          <p className="text-4xl font-bold text-green-600">$37</p>
          <p className="text-xs text-gray-400 mt-1">(One-Time Payment)</p>
        </div>

        {/* --- TRUST & GUARANTEE AREA (All Translated) --- */}
        <div className="mt-8 border-t pt-6">
          {/* 1. Social Proof */}
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            <span>★★★★★</span>
            <span className="text-gray-600 font-medium text-sm">4.9/5.0</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Based on 15,783 satisfied customers.</p>

          {/* 2. Guarantee */}
          <div className="mt-6 flex items-center justify-center gap-3 bg-gray-50 p-3 rounded-lg">
            <img src="/images/design-mode/guarantee.png" alt="Guarantee Seal" className="h-12 w-12 opacity-70" />
            <div>
              <h4 className="font-bold text-gray-800 text-left">7-Day Guarantee</h4>
              <p className="text-xs text-gray-600 text-left">
                Your satisfaction or your money back. Zero risk for you.
              </p>
            </div>
          </div>

          {/* 3. Security Seals */}
          <div className="mt-4">
            <p className="text-xs text-gray-400 mb-2">100% Secure Checkout</p>
            <img
              src="/images/secure-payment-badge2.png"
              alt="Secure Payment Badges"
              className="mx-auto h-6 opacity-80"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-[rgba(156,79,165,1)]">
      <PageHeader />
      <main className="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-xl">
        <div className="text-center space-y-8">
          {step === 1 && renderInitialStep()}
          {step === 2 && renderLoadingStep()}
          {step === 3 && renderResultsStep()}
        </div>
      </main>
      <footer className="py-4 mt-4">
        <p className="text-xs text-white">© 2024. All rights reserved.</p>
      </footer>
    </div>
  )
}
