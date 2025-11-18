"use client"

import { Search, Activity, MapPin, Eye, ShieldCheck, Heart, Camera, MessageSquare, Check, CheckCircle, Star, FolderArchive, Users } from 'lucide-react'
import Image from "next/image"
// 1. Importe o useRouter do Next.js
import { useRouter } from 'next/navigation'

// A small helper component to render the star ratings
const StarRating = ({ rating = 5 }) => (
  <div className="flex text-yellow-400">
    {Array.from({ length: rating }).map((_, index) => (
      <Star key={index} className="w-5 h-5 fill-current" />
    ))}
  </div>
);

export default function Step1() {
  // 2. Crie uma instância do router
  const router = useRouter();

  // 3. Crie uma função para lidar com o clique e navegar
  const handleNavigate = () => {
    router.push('/step-2'); // Certifique-se que o caminho '/step-2' está correto
  };

  return (
    <div className="bg-white text-gray-800 font-sans">
      {/* =================================== */}
      {/* 1. Hero Section                     */}
      {/* =================================== */}
      <section className="bg-gradient-to-br from-[#1d1d3a] via-[#2a2a4b] to-[#3a2c6b] text-white py-16 px-4 overflow-hidden">
        <div className="container mx-auto max-w-3xl text-center flex flex-col items-center">
          
          <div className="bg-gradient-to-br from-pink-500 to-red-500 p-4 rounded-2xl mb-8 shadow-lg">
            <Search className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            Today it's a <span className="text-red-500">like.</span> Tomorrow, a <span className="text-red-500">conversation.</span> And after?<br />
          </h1>

          <p className="text-lg text-gray-300 mb-8 max-w-xl">
            Betrayal doesn't start with a kiss. It starts with a direct message.
          </p>

          <div className="inline-flex items-center bg-green-900/50 text-green-300 border border-green-700 rounded-full px-4 py-1.5 text-sm mb-8">
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Advanced Detection System - Updated November 2025</span>
          </div>

          <div className="w-full max-w-lg space-y-3 text-left mb-8">
            <div className="bg-white/10 p-4 rounded-lg flex items-center gap-4 border border-white/20">
                <span>👀 Find out which "friends" see your stories that you can't view.</span>
            </div>
            <div className="bg-white/10 p-4 rounded-lg flex items-center gap-4 border border-white/20">
                <span>👍 Monitor every like, even if they try to "unlike" later.</span>
            </div>
            <div className="bg-white/10 p-4 rounded-lg flex items-center gap-4 border border-white/20">
                <span>💾 Discover the photos and videos they're saving in hidden folders.</span>
            </div>
            <div className="bg-white/10 p-4 rounded-lg flex items-center gap-4 border border-white/20">
              <span>🤫 "This message was deleted"? Find out the original content</span>
            </div>
          </div>

          {/* 4. Adicione o onClick ao botão */}
          <button 
            onClick={handleNavigate}
            className="w-full max-w-lg bg-gradient-to-r from-red-500 to-pink-600 hover:opacity-90 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105"
          >
            GET THE TRUTH – START ANONYMOUS SEARCH
          </button>
          <p className="text-xs text-gray-400 mt-2">100% anonymous investigation. They'll never know you checked.</p>
        </div>
      </section>

      {/* =================================== */}
      {/* 2. "You're Not Paranoid" Section    */}
      {/* =================================== */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            You're Not Paranoid -
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-red-500 mb-6">
            You're Protecting Yourself
          </h3>
          <p className="text-gray-500 max-w-2xl mx-auto mb-12">
            Stop second-guessing your instincts. Get the clarity you need to make informed decisions about your relationship.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="inline-block bg-pink-100 p-4 rounded-xl mb-4">
                <Search className="h-8 w-8 text-pink-500" />
              </div>
              <h4 className="font-bold text-lg mb-2">RECENT ACTIVITY</h4>
              <p className="text-gray-500 text-sm">See which social networks he uses the most</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="inline-block bg-purple-100 p-4 rounded-xl mb-4">
                <Users className="h-8 w-8 text-purple-500" />
              </div>
              <h4 className="font-bold text-lg mb-2">PROFILES VISITED </h4>
              <p className="text-gray-500 text-sm">See the most visited profiles</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="inline-block bg-red-100 p-4 rounded-xl mb-4">
                <Camera className="h-8 w-8 text-red-500" />
              </div>
              <h4 className="font-bold text-lg mb-2">LIKED PHOTOS</h4>
              <p className="text-gray-500 text-sm">See all liked photos</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="inline-block bg-orange-100 p-4 rounded-xl mb-4">
                <MessageSquare className="h-8 w-8 text-orange-500" />
              </div>
              <h4 className="font-bold text-lg mb-2">PRIVATE CONVERSATIONS</h4>
              <p className="text-gray-500 text-sm">What they're really saying to others</p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================== */}
      {/* 3. Testimonials Section             */}
      {/* =================================== */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            You're Not Alone - See What Others Discovered
          </h2>
          <div className="space-y-8">
            {/* Testimonial Cards... */}
            <div className="bg-white p-6 rounded-xl shadow-lg text-left">
              <div className="flex items-center mb-4">
                <Image src="/images/83.jpg" alt="Sarah" width={48} height={48} className="rounded-full mr-4" />
                <div>
                  <p className="font-bold">Sarah, 42</p>
                  <p className="text-sm text-green-600 flex items-center"><Check className="h-4 w-4 mr-1"/>Verified User</p>
                </div>
              </div>
              <blockquote className="text-gray-600 italic mb-4 before:content-['“'] after:content-['”']">
                I knew something was off. The report confirmed my worst fears, but at least now I could make an informed decision instead of living in constant anxiety.
              </blockquote>
              <StarRating />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-left">
              <div className="flex items-center mb-4">
                <Image src="/images/86.jpg" alt="Jennifer" width={48} height={48} className="rounded-full mr-4" />
                <div>
                  <p className="font-bold">Jennifer, 33</p>
                  <p className="text-sm text-gray-500">Investigation completed November 2025</p>
                </div>
              </div>
              <blockquote className="text-gray-600 italic mb-4 before:content-['“'] after:content-['”']">
                {"Best decision I ever made. It saved me from months of uncertainty and gave me the closure I needed. My instincts were right all along."}
              </blockquote>
              <StarRating />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-left">
              <div className="flex items-center mb-4">
                <Image src="/images/87.jpg" alt="Michelle" width={48} height={48} className="rounded-full mr-4" />
                <div>
                  <p className="font-bold">Michelle, 35</p>
                  <p className="text-sm text-green-600 flex items-center"><Check className="h-4 w-4 mr-1"/>Verified User</p>
                </div>
              </div>
              <blockquote className="text-gray-600 italic mb-4 before:content-['“'] after:content-['”']">
                I felt guilty for checking, but my instincts were right. Now I can move on with confidence instead of living in doubt.
              </blockquote>
              <StarRating />
            </div>
          </div>

          {/* 4. Adicione o onClick ao segundo botão também */}
          <button 
            onClick={handleNavigate}
            className="w-full max-w-lg mt-12 bg-gradient-to-r from-red-500 to-pink-600 hover:opacity-90 text-white font-bold py-4 px-6 rounded-full text-lg shadow-lg transition-transform transform hover:scale-105"
          >
            START MY ANONYMOUS INVESTIGATION
          </button>
          <p className="text-xs text-gray-400 mt-2">100% anonymous - Your investigation stays completely private</p>
        </div>
      </section>
    </div>
  )
}
