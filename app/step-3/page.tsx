"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import Script from "next/script" // Importa o componente <Script> do Next.js
import { Loader2, CheckCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

// Interface para definir a estrutura de cada passo do progresso
interface ProgressStep {
  id: string
  text: string
  status: "pending" | "loading" | "completed"
}

export default function Step3() {
  const router = useRouter()

  // Estados para dados vindos do Step 2
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [location, setLocation] = useState<string>("Detecting location...")

  // Estados para a simulação de carregamento
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState<number>(1) // Controla a exibição animada dos passos

  // Efeito para buscar dados do localStorage e a localização do usuário ao montar o componente
  useEffect(() => {
    // Recupera dados do Step 2
    const storedPhone = localStorage.getItem("phoneNumber")
    const storedPhoto = localStorage.getItem("profilePhoto")

    setPhoneNumber(storedPhone || "Number not found")
    setProfilePhoto(
      storedPhoto ||
        "https://media.istockphoto.com/id/1337144146/vector/default-avatar-profile-icon-vector.jpg?s=612x612&w=0&k=20&c=BIbFwuv7FxTWvh5S3vB6bkT0Qv8Vn8N5Ffseq84ClGI=",
    )

    const fetchLocation = async () => {
  try {
    // Cria um AbortController com um timeout de 5 segundos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Chama a sua API interna em /api/location
    const response = await fetch("/api/location", {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error("Failed to fetch location from internal API")
    const data = await response.json()
    
    // Define a localização com base na resposta da sua API
    setLocation(data.city || "Unknown Location") 
  } catch (error) {
    // Falha silenciosa com um fallback
    console.error("[v0] Location fetch error:", error)
    setLocation("Your Location") // Fallback em caso de erro
  }
}

    // Call fetchLocation without awaiting to prevent blocking
    fetchLocation()
  }, [])

  // Memoiza a lista de passos para que ela seja recriada apenas quando a 'location' mudar
  const steps: ProgressStep[] = useMemo(
    () => [
      { id: "initiating", text: "Initiating connection with WhatsApp servers...", status: "pending" },
      { id: "locating", text: "Locating the nearest server...", status: "pending" },
      { id: "establishing", text: "Server located! Establishing secure connection...", status: "pending" },
      { id: "verifying", text: "Verifying phone number...", status: "pending" },
      { id: "valid", text: "Valid phone number", status: "pending" },
      { id: "analyzing", text: "Analyzing database...", status: "pending" },
      { id: "fetching", text: "Fetching profile information...", status: "pending" },
      { id: "detecting", text: "Detecting device location...", status: "pending" },
      { id: "suspicious", text: `Suspicious activity detected near ${location}...`, status: "pending" },
      { id: "preparing", text: "Preparing private reading channel...", status: "pending" },
      { id: "established", text: "Private channel established!", status: "pending" },
      { id: "synchronizing", text: "Synchronizing messages...", status: "pending" },
      { id: "complete", text: "Synchronization complete!", status: "pending" },
      { id: "granted", text: "Access successfully granted!", status: "pending" },
    ],
    [location],
  )

  const [currentSteps, setCurrentSteps] = useState<ProgressStep[]>([])

  // Inicializa o estado dos passos
  useEffect(() => {
    if (steps.length > 0 && currentSteps.length === 0) {
      setCurrentSteps(steps.map((step, index) => (index === 0 ? { ...step, status: "loading" } : step)))
    }
  }, [steps, currentSteps.length])

  // Lógica principal dos timers para a barra de progresso e a transição entre os passos
  useEffect(() => {
    if (!steps.length || currentSteps.length === 0) return // Não inicia os timers até os passos estarem prontos

    const totalDuration = 4 * 60 * 1000 // Duração total de 4 minutos
    const stepInterval = totalDuration / steps.length
    const progressInterval = 100

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer)
          setIsCompleted(true)
          return 100
        }
        return prev + 100 / (totalDuration / progressInterval)
      })
    }, progressInterval)

    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const nextIndex = prev + 1
        if (nextIndex < steps.length) {
          setCurrentSteps((current) =>
            current.map((step, index) => {
              if (index < nextIndex) return { ...step, status: "completed" }
              if (index === nextIndex) return { ...step, status: "loading" }
              return step
            }),
          )
          setVisibleSteps(nextIndex + 1)
          return nextIndex
        } else {
          setCurrentSteps((current) => current.map((step) => ({ ...step, status: "completed" })))
          clearInterval(stepTimer)
          return prev
        }
      })
    }, stepInterval)

    return () => {
      clearInterval(progressTimer)
      clearInterval(stepTimer)
    }
  }, [steps, currentSteps.length])

  // Navega para o próximo passo (página 4)
  const handleViewReport = () => {
    const selectedGender = localStorage.getItem("selectedGender") || "male"
    if (selectedGender === "female") {
      router.push("/step-4/female")
    } else {
      router.push("/step-4/male")
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div className="bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden">
          <div className="p-4">
            <div className="aspect-video rounded-md overflow-hidden shadow-lg bg-black">
              <vturb-smartplayer
                id="vid-690696cdf19aad22a5567aea"
                style={{
                  display: "block",
                  margin: "0 auto",
                  width: "100%",
                }}
              />
            </div>
          </div>

          {/* Seção de Perfil e Progresso */}
          <div className="p-6 pt-2">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-gray-300 mb-3">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto || "/placeholder.svg"}
                    alt="WhatsApp Profile"
                    width={64}
                    height={64}
                    className="object-cover h-full w-full"
                    unoptimized
                  />
                ) : (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-lg mb-1">WhatsApp Profile</h3>
                <p className="text-gray-600 mb-2">{phoneNumber || "Loading number..."}</p>
                <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              </div>
            </div>

            {/* Conteúdo Dinâmico: Carregando ou Completo */}
            {!isCompleted ? (
              // Estado de Carregamento
              <>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium text-sm">
                      {currentSteps[currentStepIndex]?.text || "Connecting..."}
                    </span>
                    <span className="text-green-600 font-bold text-sm">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {currentSteps.slice(0, visibleSteps).map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-3 text-sm transition-all duration-500 ${
                        index < visibleSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                      }`}
                    >
                      <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                        {step.status === "loading" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        ) : step.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-3.5 w-3.5 mt-px rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                      <span
                        className={`transition-colors duration-300 ${
                          step.status === "completed"
                            ? "text-green-600 font-medium"
                            : step.status === "loading"
                              ? "text-blue-600 font-medium"
                              : "text-gray-600"
                        }`}
                      >
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              // Estado Completo
              <div className="text-center py-4 border-t border-gray-200 mt-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Synchronization Complete!</h3>
                <p className="text-gray-600 mb-6">Your private access has been successfully established.</p>
                <Button
                  onClick={handleViewReport}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white text-lg font-medium rounded-lg"
                >
                  View Full Report Now
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full max-w-md text-center py-4">
          <div className="flex justify-center space-x-6 text-sm mb-3">
            <Link href="#" className="text-gray-500 hover:text-blue-500">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-500 hover:text-blue-500">
              Terms of Use
            </Link>
            <Link href="#" className="text-gray-500 hover:text-blue-500">
              Email Support
            </Link>
          </div>
          <p className="text-gray-400 text-xs">© 2024 Protect Your Relationship. All rights reserved.</p>
        </footer>
      </div>

      <Script
        id="vturb-player-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var s = document.createElement("script");
              s.src = "https://scripts.converteai.net/8671d2f6-c45f-4b55-9776-68f6c495a79a/players/690696cdf19aad22a5567aea/v4/player.js";
              s.async = true;
              document.head.appendChild(s);
            })();
          `,
        }}
      />
    </>
  )
}
