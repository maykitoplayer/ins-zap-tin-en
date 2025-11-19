"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from 'next/navigation'
import Image from "next/image"
import Script from "next/script"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, CheckCircle, Loader2, MapPin, X, CheckCheck, AlertTriangle, LockOpen } from 'lucide-react'

// =======================================================
// HELPER COMPONENTS
// =======================================================

type Message = {
  type: "incoming" | "outgoing"
  content: string
  time: string
  isBlocked?: boolean
}

const RealtimeMap = ({ lat, lng, city, country }: { lat: number; lng: number; city: string; country: string }) => {
  const mapEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=13&output=embed`
  return (
    <div className="relative h-96 w-full rounded-lg overflow-hidden shadow-inner">
      <iframe className="absolute top-0 left-0 w-full h-full border-0" loading="lazy" allowFullScreen src={mapEmbedUrl}></iframe>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="bg-gray-800/80 text-white text-xs font-bold py-1 px-3 rounded">GPS TRACKING</span>
          <span className="bg-red-600 text-white text-xs font-bold py-1 px-3 rounded">LIVE</span>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute h-20 w-20 rounded-full bg-red-600/30 animate-ping"></div>
          <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-red-600 border-2 border-white shadow-xl"><MapPin className="h-6 w-6 text-white" /></div>
        </div>
        <div className="text-white">
          <div className="flex items-center gap-2 font-bold text-red-400"><AlertTriangle className="h-5 w-5" /><span>SUSPICIOUS ACTIVITY DETECTED</span></div>
          <p className="text-sm text-gray-200">Location: {city}, {country}</p>
          <p className="text-sm text-gray-200">Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}</p>
        </div>
      </div>
    </div>
  )
}

const ChatPopup = ({ onClose, profilePhoto, conversationData, conversationName }: { onClose: () => void; profilePhoto: string | null; conversationData: Message[]; conversationName: string }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-teal-600 text-white p-3 flex items-center gap-3">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-teal-700 transition-colors"><X className="h-5 w-5" /></button>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"><Image src={profilePhoto || "/placeholder.svg"} alt="Profile" width={40} height={40} className="object-cover h-full w-full" unoptimized /></div>
          <div className="flex items-center gap-2"><span className="font-semibold">{conversationName.replace("🔒", "").trim()}</span>{conversationName.includes("🔒") && <Lock className="h-4 w-4" />}</div>
        </div>
        <div className="bg-gray-200 p-4 space-y-4 h-[28rem] overflow-y-scroll">
          {conversationData.map((msg, index) => msg.type === "incoming" ? (
            <div key={index} className="flex justify-start"><div className="bg-white rounded-lg p-3 max-w-[80%] shadow"><p className={`text-sm ${msg.isBlocked ? "font-semibold text-red-500" : "text-gray-800"}`}>{msg.content}</p><p className="text-right text-xs text-gray-400 mt-1">{msg.time}</p></div></div>
          ) : (
            <div key={index} className="flex justify-end"><div className="bg-lime-200 rounded-lg p-3 max-w-[80%] shadow"><p className={`text-sm ${msg.isBlocked ? "font-semibold text-red-500" : "text-gray-800"}`}>{msg.content}</p><div className="flex justify-end items-center mt-1"><span className="text-xs text-gray-500 mr-1">{msg.time}</span><CheckCheck className="h-4 w-4 text-blue-500" /></div></div></div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 text-center bg-gradient-to-t from-white via-white/95 to-transparent"><p className="text-gray-700 font-medium">To view the full conversation, you need to unlock the chats.</p></div>
      </div>
    </div>
  )
}

// =======================================================
// MAIN COMPONENT U1
// =======================================================

interface ProgressStep {
  id: string
  text: string
  status: "pending" | "loading" | "completed"
}

const countries = [
  { code: "+1", name: "United States", flag: "🇺🇸", placeholder: "(555) 123-4567" },
  { code: "+1", name: "Canada", flag: "🇨🇦", placeholder: "(555) 123-4567" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", placeholder: "7911 123456" },
  { code: "+33", name: "France", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "+49", name: "Germany", flag: "🇩🇪", placeholder: "1512 3456789" },
  { code: "+39", name: "Italy", flag: "🇮🇹", placeholder: "312 345 6789" },
  { code: "+34", name: "Spain", flag: "🇪🇸", placeholder: "612 34 56 78" },
  { code: "+52", name: "Mexico", flag: "🇲🇽", placeholder: "55 1234 5678" },
  { code: "+55", name: "Brazil", flag: "🇧🇷", placeholder: "(11) 99999-9999" },
  { code: "+54", name: "Argentina", flag: "🇦🇷", placeholder: "11 1234-5678" },
  { code: "+56", name: "Chile", flag: "🇨🇱", placeholder: "9 1234 5678" },
  { code: "+57", name: "Colombia", flag: "🇨🇴", placeholder: "300 1234567" },
  { code: "+51", name: "Peru", flag: "🇵🇪", placeholder: "912 345 678" },
  { code: "+58", name: "Venezuela", flag: "🇻🇪", placeholder: "412-1234567" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨", placeholder: "99 123 4567" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾", placeholder: "961 123456" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾", placeholder: "94 123 456" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴", placeholder: "71234567" },
  { code: "+81", name: "Japan", flag: "🇯🇵", placeholder: "90-1234-5678" },
  { code: "+82", name: "South Korea", flag: "🇰🇷", placeholder: "10-1234-5678" },
  { code: "+86", name: "China", flag: "🇨🇳", placeholder: "138 0013 8000" },
  { code: "+91", name: "India", flag: "🇮🇳", placeholder: "81234 56789" },
  { code: "+61", name: "Australia", flag: "🇦🇺", placeholder: "412 345 678" },
  { code: "+64", name: "New Zealand", flag: "🇳🇿", placeholder: "21 123 4567" },
  { code: "+27", name: "South Africa", flag: "🇿🇦", placeholder: "71 123 4567" },
  { code: "+20", name: "Egypt", flag: "🇪🇬", placeholder: "100 123 4567" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬", placeholder: "802 123 4567" },
  { code: "+254", name: "Kenya", flag: "🇰🇪", placeholder: "712 123456" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "+90", name: "Turkey", flag: "🇹🇷", placeholder: "501 234 56 78" },
  { code: "+7", name: "Russia", flag: "🇷🇺", placeholder: "912 345-67-89" },
  { code: "+380", name: "Ukraine", flag: "🇺🇦", placeholder: "50 123 4567" },
  { code: "+48", name: "Poland", flag: "🇵🇱", placeholder: "512 345 678" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "+32", name: "Belgium", flag: "🇧🇪", placeholder: "470 12 34 56" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "+43", name: "Austria", flag: "🇦🇹", placeholder: "664 123456" },
  { code: "+45", name: "Denmark", flag: "🇩🇰", placeholder: "20 12 34 56" },
  { code: "+46", name: "Sweden", flag: "🇸🇪", placeholder: "70-123 45 67" },
  { code: "+47", name: "Norway", flag: "🇳🇴", placeholder: "406 12 345" },
  { code: "+358", name: "Finland", flag: "🇫🇮", placeholder: "50 123 4567" },
  { code: "+65", name: "Singapore", flag: "🇸🇬", placeholder: "8123 4567" },
  { code: "+63", name: "Philippines", flag: "🇵🇭", placeholder: "912 345 6789" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩", placeholder: "0812 3456 789" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾", placeholder: "012-345 6789" },
  { code: "+66", name: "Thailand", flag: "🇹🇭", placeholder: "081 234 5678" },
  { code: "+84", name: "Vietnam", flag: "🇻🇳", placeholder: "091 234 56 78" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰", placeholder: "0300 1234567" },
  { code: "+98", name: "Iran", flag: "🇮🇷", placeholder: "0912 345 6789" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰", placeholder: "071 123 4567" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩", placeholder: "01712 345678" },
  { code: "+855", name: "Cambodia", flag: "🇰🇭", placeholder: "092 123 456" },
  { code: "+673", name: "Brunei", flag: "🇧🇳", placeholder: "872 1234" },
  { code: "+679", name: "Fiji", flag: "🇫🇯", placeholder: "920 1234" },
  { code: "+675", name: "Papua New Guinea", flag: "🇵🇬", placeholder: "723 45678" },
  { code: "+677", name: "Solomon Islands", flag: "🇸🇧", placeholder: "742 1234" },
  { code: "+678", name: "Vanuatu", flag: "🇻🇺", placeholder: "778 1234" },
  { code: "+691", name: "Micronesia", flag: "🇫🇲", placeholder: "920 1234" },
  { code: "+692", name: "Marshall Islands", flag: "🇲🇭", placeholder: "692 1234" },
  { code: "+680", name: "Palau", flag: "🇵🇼", placeholder: "620 1234" },
  { code: "+685", name: "Samoa", flag: "🇼🇸", placeholder: "722 1234" },
  { code: "+676", name: "Tonga", flag: "🇹🇴", placeholder: "771 1234" },
  { code: "+682", name: "Cook Islands", flag: "🇨🇰", placeholder: "722 1234" },
  { code: "+683", name: "Niue", flag: "🇳🇺", placeholder: "811 1234" },
  { code: "+672", name: "Norfolk Island", flag: "🇳🇫", placeholder: "512 1234" },
  { code: "+670", name: "Timor-Leste", flag: "🇹🇱", placeholder: "771 1234" },
  { code: "+688", name: "Tuvalu", flag: "🇹🇻", placeholder: "771 1234" },
  { code: "+690", name: "Tokelau", flag: "🇹🇰", placeholder: "811 1234" },
  { code: "+239", name: "Sao Tome and Principe", flag: "🇸🇹", placeholder: "981 1234" },
  { code: "+240", name: "Equatorial Guinea", flag: "🇬🇶", placeholder: "222 123 456" },
  { code: "+241", name: "Gabon", flag: "🇬🇦", placeholder: "06 12 34 56 78" },
  { code: "+242", name: "Republic of the Congo", flag: "🇨🇬", placeholder: "06 123 4567" },
  { code: "+243", name: "Democratic Republic of the Congo", flag: "🇨🇩", placeholder: "081 123 4567" },
  { code: "+244", name: "Angola", flag: "🇦🇴", placeholder: "923 123 456" },
  { code: "+245", name: "Guinea-Bissau", flag: "🇬🇼", placeholder: "955 123 456" },
  { code: "+246", name: "Diego Garcia", flag: "🇮🇴", placeholder: "380 1234" },
  { code: "+247", name: "Ascension Island", flag: "🇦🇨", placeholder: "650 1234" },
  { code: "+248", name: "Seychelles", flag: "🇸🇨", placeholder: "2 510 123" },
  { code: "+249", name: "Sudan", flag: "🇸🇩", placeholder: "091 123 4567" },
  { code: "+250", name: "Rwanda", flag: "🇷🇼", placeholder: "072 123 4567" },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹", placeholder: "091 123 4567" },
  { code: "+252", name: "Somalia", flag: "🇸🇴", placeholder: "61 123 4567" },
  { code: "+253", name: "Djibouti", flag: "🇩🇯", placeholder: "77 123 456" },
  { code: "+255", name: "Tanzania", flag: "🇹🇿", placeholder: "071 123 4567" },
  { code: "+256", name: "Uganda", flag: "🇺🇬", placeholder: "070 123 4567" },
  { code: "+257", name: "Burundi", flag: "🇧🇮", placeholder: "79 123 456" },
  { code: "+258", name: "Mozambique", flag: "🇲🇿", placeholder: "82 123 4567" },
  { code: "+260", name: "Zambia", flag: "🇿🇲", placeholder: "095 123 4567" },
  { code: "+261", name: "Madagascar", flag: "🇲🇬", placeholder: "032 12 345 67" },
  { code: "+262", name: "Reunion", flag: "🇷🇪", placeholder: "0692 12 34 56" },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼", placeholder: "071 123 456" },
  { code: "+264", name: "Namibia", flag: "🇳🇦", placeholder: "081 123 4567" },
  { code: "+265", name: "Malawi", flag: "🇲🇼", placeholder: "099 123 4567" },
  { code: "+266", name: "Lesotho", flag: "🇱🇸", placeholder: "501 123 456" },
  { code: "+267", name: "Botswana", flag: "🇧🇼", placeholder: "71 123 456" },
  { code: "+268", name: "Eswatini", flag: "🇸🇿", placeholder: "761 123 456" },
  { code: "+269", name: "Comoros", flag: "🇰🇲", placeholder: "321 1234" },
  { code: "+290", name: "Saint Helena", flag: "🇸🇭", placeholder: "659 1234" },
  { code: "+291", name: "Eritrea", flag: "🇪🇷", placeholder: "07 123 456" },
  { code: "+297", name: "Aruba", flag: "🇦🇼", placeholder: "560 1234" },
  { code: "+298", name: "Faroe Islands", flag: "🇫🇴", placeholder: "211234" },
  { code: "+299", name: "Greenland", flag: "🇬🇱", placeholder: "221234" },
  { code: "+350", name: "Gibraltar", flag: "🇬🇮", placeholder: "571 12345" },
  { code: "+351", name: "Portugal", flag: "🇵🇹", placeholder: "912 345 678" },
  { code: "+352", name: "Luxembourg", flag: "🇱🇺", placeholder: "621 123 456" },
  { code: "+353", name: "Ireland", flag: "🇮🇪", placeholder: "083 123 4567" },
  { code: "+354", name: "Iceland", flag: "🇮🇸", placeholder: "611 1234" },
  { code: "+355", name: "Albania", flag: "🇦🇱", placeholder: "067 123 4567" },
  { code: "+356", name: "Malta", flag: "🇲🇹", placeholder: "799 12345" },
  { code: "+357", name: "Cyprus", flag: "🇨🇾", placeholder: "961 12345" },
  { code: "+358", name: "Finland", flag: "🇫🇮", placeholder: "50 123 4567" },
  { code: "+359", name: "Bulgaria", flag: "🇧🇬", placeholder: "088 123 4567" },
  { code: "+370", name: "Lithuania", flag: "🇱🇹", placeholder: "601 12345" },
  { code: "+371", name: "Latvia", flag: "🇱🇻", placeholder: "200 12345" },
  { code: "+372", name: "Estonia", flag: "🇪🇪", placeholder: "501 1234" },
  { code: "+373", name: "Moldova", flag: "🇲🇩", placeholder: "068 123 456" },
  { code: "+374", name: "Armenia", flag: "🇦🇲", placeholder: "091 123 456" },
  { code: "+375", name: "Belarus", flag: "🇧🇾", placeholder: "029 123 4567" },
  { code: "+376", name: "Andorra", flag: "🇦🇩", placeholder: "606 123 456" },
  { code: "+377", name: "Monaco", flag: "🇲🇨", placeholder: "06 12 34 56 78" },
  { code: "+378", name: "San Marino", flag: "🇸🇲", placeholder: "333 123456" },
  { code: "+379", name: "Vatican City", flag: "🇻🇦", placeholder: "333 123456" },
  { code: "+381", name: "Serbia", flag: "🇷🇸", placeholder: "061 123 4567" },
  { code: "+382", name: "Montenegro", flag: "🇲🇪", placeholder: "067 123 456" },
  { code: "+383", name: "Kosovo", flag: "🇽🇰", placeholder: "049 123 456" },
  { code: "+385", name: "Croatia", flag: "🇭🇷", placeholder: "091 123 4567" },
  { code: "+386", name: "Slovenia", flag: "🇸🇮", placeholder: "031 123 456" },
  { code: "+387", name: "Bosnia and Herzegovina", flag: "🇧🇦", placeholder: "061 123 456" },
  { code: "+389", name: "North Macedonia", flag: "🇲🇰", placeholder: "070 123 456" },
  { code: "+420", name: "Czech Republic", flag: "🇨🇿", placeholder: "601 123 456" },
  { code: "+421", name: "Slovakia", flag: "🇸🇰", placeholder: "0911 123 456" },
  { code: "+423", name: "Liechtenstein", flag: "🇱🇮", placeholder: "660 123 456" },
  { code: "+500", name: "Falkland Islands", flag: "🇫🇰", placeholder: "51234" },
  { code: "+501", name: "Belize", flag: "🇧🇿", placeholder: "622 1234" },
  { code: "+502", name: "Guatemala", flag: "🇬🇹", placeholder: "5512 3456" },
  { code: "+503", name: "El Salvador", flag: "🇸🇻", placeholder: "7012 3456" },
  { code: "+504", name: "Honduras", flag: "🇭🇳", placeholder: "9123 4567" },
  { code: "+505", name: "Nicaragua", flag: "🇳🇮", placeholder: "8712 3456" },
  { code: "+506", name: "Costa Rica", flag: "🇨🇷", placeholder: "8312 3456" },
  { code: "+507", name: "Panama", flag: "🇵🇦", placeholder: "6712 3456" },
  { code: "+508", name: "Saint Pierre and Miquelon", flag: "🇵🇲", placeholder: "551 1234" },
  { code: "+509", name: "Haiti", flag: "🇭🇹", placeholder: "3412 3456" },
  { code: "+590", name: "Guadeloupe", flag: "🇬🇵", placeholder: "0690 12 34 56" },
  { code: "+591", name: "Bolivia", flag: "🇧🇴", placeholder: "71234567" },
  { code: "+592", name: "Guyana", flag: "🇬🇾", placeholder: "612 3456" },
  { code: "+593", name: "Ecuador", flag: "🇪🇨", placeholder: "99 123 4567" },
  { code: "+594", name: "French Guiana", flag: "🇬🇫", placeholder: "0694 12 34 56" },
  { code: "+595", name: "Paraguay", flag: "🇵🇾", placeholder: "961 123456" },
  { code: "+596", name: "Martinique", flag: "🇲🇶", placeholder: "0696 12 34 56" },
  { code: "+597", name: "Suriname", flag: "🇸🇷", placeholder: "741 1234" },
  { code: "+598", name: "Uruguay", flag: "🇺🇾", placeholder: "94 123 456" },
  { code: "+599", name: "Curaçao", flag: "🇨🇼", placeholder: "9 561 1234" },
  { code: "+670", name: "Timor-Leste", flag: "🇹🇱", placeholder: "771 1234" },
  { code: "+672", name: "Australian Antarctic Territory", flag: "🇦🇶", placeholder: "512 1234" },
  { code: "+673", name: "Brunei", flag: "🇧🇳", placeholder: "872 1234" },
  { code: "+674", name: "Nauru", flag: "🇳🇷", placeholder: "555 1234" },
  { code: "+675", name: "Papua New Guinea", flag: "🇵🇬", placeholder: "723 45678" },
  { code: "+676", name: "Tonga", flag: "🇹🇴", placeholder: "771 1234" },
  { code: "+677", name: "Solomon Islands", flag: "🇸🇧", placeholder: "742 1234" },
  { code: "+678", name: "Vanuatu", flag: "🇻🇺", placeholder: "778 1234" },
  { code: "+679", name: "Fiji", flag: "🇫🇯", placeholder: "920 1234" },
  { code: "+680", name: "Palau", flag: "🇵🇼", placeholder: "620 1234" },
  { code: "+681", name: "Wallis and Futuna", flag: "🇼🇫", placeholder: "721 1234" },
  { code: "+682", name: "Cook Islands", flag: "🇨🇰", placeholder: "722 1234" },
  { code: "+683", name: "Niue", flag: "🇳🇺", placeholder: "811 1234" },
  { code: "+685", name: "Samoa", flag: "🇼🇸", placeholder: "722 1234" },
  { code: "+686", name: "Kiribati", flag: "🇰🇮", placeholder: "720 1234" },
  { code: "+687", name: "New Caledonia", flag: "🇳🇨", placeholder: "750 1234" },
  { code: "+688", name: "Tuvalu", flag: "🇹🇻", placeholder: "771 1234" },
  { code: "+689", name: "French Polynesia", flag: "🇵🇫", placeholder: "87 12 34 56" },
  { code: "+690", name: "Tokelau", flag: "🇹🇰", placeholder: "811 1234" },
  { code: "+691", name: "Micronesia", flag: "🇫🇲", placeholder: "920 1234" },
  { code: "+692", name: "Marshall Islands", flag: "🇲🇭", placeholder: "692 1234" },
  { code: "+850", name: "North Korea", flag: "🇰🇵", placeholder: "191 123 4567" },
  { code: "+852", name: "Hong Kong", flag: "🇭🇰", placeholder: "6123 4567" },
  { code: "+853", name: "Macau", flag: "🇲🇴", placeholder: "6612 3456" },
  { code: "+855", name: "Cambodia", flag: "🇰🇭", placeholder: "092 123 456" },
  { code: "+856", name: "Laos", flag: "🇱🇦", placeholder: "020 1234 5678" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩", placeholder: "01712 345678" },
  { code: "+886", name: "Taiwan", flag: "🇹🇼", placeholder: "0912 345 678" },
  { code: "+960", name: "Maldives", flag: "🇲🇻", placeholder: "777 1234" },
  { code: "+961", name: "Lebanon", flag: "🇱🇧", placeholder: "03 123 456" },
  { code: "+962", name: "Jordan", flag: "🇯🇴", placeholder: "079 123 4567" },
  { code: "+963", name: "Syria", flag: "🇸🇾", placeholder: "093 123 456" },
  { code: "+964", name: "Iraq", flag: "🇮🇶", placeholder: "0790 123 4567" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼", placeholder: "600 12345" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "+967", name: "Yemen", flag: "🇾🇪", placeholder: "711 123 456" },
  { code: "+968", name: "Oman", flag: "🇴🇲", placeholder: "921 12345" },
  { code: "+970", name: "Palestine", flag: "🇵🇸", placeholder: "0599 123 456" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "+972", name: "Israel", flag: "🇮🇱", placeholder: "052-123-4567" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭", placeholder: "3600 1234" },
  { code: "+974", name: "Qatar", flag: "🇶🇦", placeholder: "3312 3456" },
  { code: "+975", name: "Bhutan", flag: "🇧🇹", placeholder: "17 123 456" },
  { code: "+976", name: "Mongolia", flag: "🇲🇳", placeholder: "8812 3456" },
  { code: "+977", name: "Nepal", flag: "🇳🇵", placeholder: "984 123 4567" },
  { code: "+992", name: "Tajikistan", flag: "🇹🇯", placeholder: "917 123 456" },
  { code: "+993", name: "Turkmenistan", flag: "🇹🇲", placeholder: "66 123 4567" },
  { code: "+994", name: "Azerbaijan", flag: "🇦🇿", placeholder: "050 123 45 67" },
  { code: "+995", name: "Georgia", flag: "🇬🇪", placeholder: "555 12 34 56" },
  { code: "+996", name: "Kyrgyzstan", flag: "🇰🇬", placeholder: "0700 123 456" },
  { code: "+998", name: "Uzbekistan", flag: "🇺🇿", placeholder: "90 123 45 67" },
]

export default function U1() {
  const router = useRouter()

  // NOVO ESTADO PARA GÊNERO
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | 'Non-binary'>('Female');
  
  const [isLoadingStarted, setIsLoadingStarted] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedCountry, setSelectedCountry] = useState(countries.find(c => c.name === "United States") || countries[0])
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)
  const [countrySearch, setCountrySearch] = useState("")
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false)
  const [isPhotoPrivate, setIsPhotoPrivate] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [visibleSteps, setVisibleSteps] = useState<number>(1)
  const [currentSteps, setCurrentSteps] = useState<ProgressStep[]>([])
  
  const [location, setLocation] = useState<{ lat: number; lng: number; city: string; country: string } | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)
  const [selectedConvoIndex, setSelectedConvoIndex] = useState<number | null>(null)
  
  const [timeLeft, setTimeLeft] = useState(5 * 60);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const defaultLocation = { lat: -23.5505, lng: -46.6333, city: "São Paulo", country: "Brazil" }

  // DADOS DO RELATÓRIO AGORA SÃO DINÂMICOS COM BASE NO GÊNERO
  const { reportConversations, reportMedia } = useMemo(() => {
    const isMale = selectedGender === 'Male';
    // Para 'Non-binary', usamos 'Female' como padrão para este exemplo
    const genderPath = isMale ? 'male/zap' : 'female/zap';
    const suffix = isMale ? 'f' : 'h';

    const conversations = [
      { img: `/images/${genderPath}/1-${suffix}.png`, name: "Blocked 🔒", msg: "Recovered deleted message", time: "Yesterday", popupName: "Blocked 🔒", chatData: [{ type: "incoming", content: "Hi, how are you?", time: "2:38 PM" }, { type: "outgoing", content: "I'm good, and you?", time: "2:40 PM" }, { type: "incoming", content: "Blocked content", time: "2:43 PM", isBlocked: true }] as Message[] },
      { img: `/images/${genderPath}/2-${suffix}.png`, name: "Blocked 🔒", msg: "Suspicious audio detected", time: "2 days ago", popupName: "Blocked", chatData: [{ type: "incoming", content: "Hey my love", time: "10:21 PM" }, { type: "outgoing", content: "I'm here, my love", time: "10:27 PM" }, { type: "incoming", content: "Blocked content", time: "10:29 PM", isBlocked: true }] as Message[] },
      { img: `/images/${genderPath}/3-${suffix}.png`, name: "Blocked 🔒", msg: "Suspicious photos found", time: "3 days ago", popupName: "Blocked", chatData: [{ type: "incoming", content: "Hi, how have you been?", time: "11:45 AM" }, { type: "outgoing", content: "I'm fine, thanks! What about you?", time: "11:47 AM" }, { type: "incoming", content: "Blocked content", time: "11:50 AM", isBlocked: true }] as Message[] },
    ];
    
    const media = [ `/images/${genderPath}/4-${suffix}.png`, `/images/${genderPath}/5-${suffix}.png`, `/images/${genderPath}/6-${suffix}.png`, `/images/${genderPath}/7-${suffix}.png`, `/images/${genderPath}/8-${suffix}.png`, `/images/${genderPath}/9-${suffix}.png`,];

    return { reportConversations: conversations, reportMedia: media };
  }, [selectedGender]);
  
  const suspiciousKeywords = [{ word: "Naughty", count: 13 }, { word: "Love", count: 22 }, { word: "Secret", count: 7 }, { word: "Hidden", count: 11 }, { word: "Don't tell", count: 5 }]
  
  const filteredCountries = useMemo(() => countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch)), [countrySearch])

  const fetchWhatsAppPhoto = async (phone: string) => {
    if (phone.replace(/[^0-9]/g, "").length < 10) return
    setIsLoadingPhoto(true)
    setPhotoError("")
    setProfilePhoto(null)
    // Nota: Não resetamos isPhotoPrivate para falso imediatamente aqui, pois queremos manter o status da requisição
    
    try {
      const response = await fetch("/api/whatsapp-photo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }), })
      const data = await response.json()
      
      // Lógica Atualizada: Se a foto for privada, definimos o placeholder mas NÃO tratamos como erro fatal
      if (data?.is_photo_private) {
        setProfilePhoto("/placeholder.svg")
        setIsPhotoPrivate(true)
        setPhotoError("") // Limpa erros para permitir o avanço
        return
      }

      if (!response.ok || !data?.success) {
        setProfilePhoto("/placeholder.svg")
        setIsPhotoPrivate(false) // Erro genérico não é necessariamente perfil privado
        setPhotoError("Could not load photo.")
        return
      }

      setProfilePhoto(data.result)
      setIsPhotoPrivate(false)
      
    } catch (error) {
      console.error("Error fetching photo:", error)
      setProfilePhoto("/placeholder.svg")
      setPhotoError("Error loading photo.")
    } finally {
      setIsLoadingPhoto(false)
    }
  }

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = e.target.value.replace(/[^0-9-()\s]/g, "")
    setPhoneNumber(formattedValue)
    setIsPhotoPrivate(false) // Reseta o aviso ao digitar novo número
    setPhotoError("")
    if (debounceTimeout) clearTimeout(debounceTimeout)
    const newTimeout = setTimeout(() => {
      const cleanPhone = (selectedCountry.code + formattedValue).replace(/[^0-9]/g, "")
      if (cleanPhone.length >= 11) fetchWhatsAppPhoto(cleanPhone)
    }, 2000)
    setDebounceTimeout(newTimeout)
  }

  const handleSelectCountry = (country: typeof countries[0]) => {
    setSelectedCountry(country)
    setShowCountryDropdown(false)
    setCountrySearch("")
    setPhoneNumber("")
    setProfilePhoto(null)
    setPhotoError("")
    setIsPhotoPrivate(false) 
    if (debounceTimeout) clearTimeout(debounceTimeout)
  }

  useEffect(() => {
    const fetchLocation = async () => {
      setIsLoadingLocation(true);
      try {
        const response = await fetch('/api/location');
        if (!response.ok) throw new Error('API response not OK');
        const data = await response.json();
        if (data.lat && data.lon) {
          setLocation({ lat: data.lat, lng: data.lon, city: data.city, country: data.country });
        } else {
          setLocation(defaultLocation);
        }
      } catch (error) {
        console.error("Failed to fetch location:", error);
        setLocation(defaultLocation);
      } finally {
        setIsLoadingLocation(false);
      }
    };
    fetchLocation();
  }, []);

  const steps: ProgressStep[] = useMemo(() => [
    { id: "initiating", text: "Initiating connection...", status: "pending" },
    { id: "locating", text: "Locating nearest server...", status: "pending" },
    { id: "establishing", text: "Establishing secure connection...", status: "pending" },
    { id: "verifying", text: "Verifying phone number...", status: "pending" },
    { id: "valid", text: "Valid phone number", status: "pending" },
    { id: "analyzing", text: "Analyzing database...", status: "pending" },
    { id: "fetching", text: "Fetching profile information...", status: "pending" },
    { id: "detecting", text: "Detecting device location...", status: "pending" },
    { id: "suspicious", text: `Suspicious activity near ${location?.city || '...'}`, status: "pending" },
    { id: "preparing", text: "Preparing private channel...", status: "pending" },
    { id: "established", text: "Private channel established!", status: "pending" },
    { id: "synchronizing", text: "Synchronizing messages...", status: "pending" },
    { id: "complete", text: "Synchronization complete!", status: "pending" },
    { id: "granted", text: "Access successfully granted!", status: "pending" },
  ], [location])

  useEffect(() => {
    if (steps.length > 0 && currentSteps.length === 0) {
      setCurrentSteps(steps.map((step, index) => (index === 0 ? { ...step, status: "loading" } : step)))
    }
  }, [steps, currentSteps.length])

  useEffect(() => {
    if (!isLoadingStarted || isCompleted) return

    const totalDuration = 20 * 1000 // 20 segundos de animação
    const stepInterval = totalDuration / steps.length
    const progressIntervalTime = 100

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer)
          setIsCompleted(true)
          return 100
        }
        return prev + 100 / (totalDuration / progressIntervalTime)
      })
    }, progressIntervalTime)

    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const nextIndex = prev + 1
        if (nextIndex < steps.length) {
          setCurrentSteps((current) => current.map((step, index) => (index < nextIndex ? { ...step, status: "completed" } : index === nextIndex ? { ...step, status: "loading" } : step)))
          setVisibleSteps((v) => v + 1)
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
  }, [isLoadingStarted, isCompleted, steps])
  
  useEffect(() => {
    if (isCompleted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isCompleted, timeLeft]);

  useEffect(() => {
    if (isCompleted) {
      if (typeof (window as any).checkoutElements !== 'undefined') {
        try { 
          (window as any).checkoutElements.init('salesFunnel').mount('#hotmart-sales-funnel'); 
        } catch (e) { 
          console.error("Failed to mount Hotmart widget:", e); 
        }
      }
    }
  }, [isCompleted]);

  const handleStartLoadingProcess = () => {
    const fullNumber = (selectedCountry.code + phoneNumber).replace(/[^0-9+]/g, "")
    if (fullNumber.length > 10) {
      const finalPhoto = profilePhoto || "/placeholder.svg"
      localStorage.setItem("profilePhoto", finalPhoto)
      localStorage.setItem("phoneNumber", fullNumber)
      localStorage.setItem("selectedGender", selectedGender) 
      setProfilePhoto(finalPhoto)
      setIsLoadingStarted(true)
    } else {
      setPhotoError("Please enter a valid phone number.")
    }
  }

  return (
    <>
      <div className="bg-red-600 text-center py-2.5 px-4">
        <p className="text-sm font-semibold">
          <span className="text-white">Attention: do not close this page, </span>
          <span className="text-yellow-300">Your payment is still being processed.</span>
        </p>
      </div>
      
      <Script src="https://checkout.hotmart.com/lib/hotmart-checkout-elements.js" strategy="afterInteractive" />

     <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4 py-12">
  <main className="w-full max-w-md mx-auto text-center space-y-8">
    
    <p className="text-lg text-gray-800">
      <span className="font-bold text-red-600">ATTENTION!</span> Our system has identified that many of the new Instagram conversations are being completed on WhatsApp.
    </p>

    <div className="flex items-center justify-center gap-2 text-green-500 font-semibold text-lg">
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.051 3.488" />
      </svg>
      <span>WhatsApp</span>
    </div>
          
          <div className="mx-auto mb-6 h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
            {isLoadingPhoto ? <Loader2 className="h-10 w-10 text-gray-500 animate-spin" /> : profilePhoto ? <Image src={profilePhoto || "/placeholder.svg"} alt="WhatsApp Profile" width={128} height={128} className="object-cover h-full w-full" unoptimized onError={() => setProfilePhoto("/placeholder.svg")} /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
          </div>
          
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Congratulations, you've earned<br />1 free access!</h1>
            <p className="text-lg text-gray-500">Enter the number below and start silent monitoring.</p>
          </div>

          <div className="w-full space-y-6">
            
            <div className="w-full space-y-4 text-left">
  <h2 className="font-semibold text-gray-800 text-lg">What gender are they?</h2>
  <div className="grid grid-cols-3 gap-3">
    
    <button
      onClick={() => setSelectedGender('Male')}
      className={`flex flex-col items-center justify-center gap-2 p-4 bg-white border rounded-xl shadow-sm transition-all duration-200 ${
        selectedGender === 'Male'
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-5xl">👨🏻</span>
      <span className="font-medium text-gray-700">Male</span>
    </button>

    <button
      onClick={() => setSelectedGender('Female')}
      className={`flex flex-col items-center justify-center gap-2 p-4 bg-white border rounded-xl shadow-sm transition-all duration-200 ${
        selectedGender === 'Female'
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-5xl">👩🏻</span>
      <span className="font-medium text-gray-700">Female</span>
    </button>

    <button
      onClick={() => setSelectedGender('Non-binary')}
      className={`flex flex-col items-center justify-center gap-2 p-4 bg-white border rounded-xl shadow-sm transition-all duration-200 ${
        selectedGender === 'Non-binary'
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className="text-5xl">🧑🏻</span>
      <span className="font-medium text-gray-700">Non-binary</span>
    </button>
  </div>
</div>

            <div className="flex items-center bg-white rounded-xl border-2 border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
              <div className="relative">
                <button type="button" onClick={() => setShowCountryDropdown(!showCountryDropdown)} className="flex items-center gap-2 h-14 px-4 bg-gray-50 hover:bg-gray-100 rounded-l-lg transition-colors"><span className="text-2xl">{selectedCountry.flag}</span><span className="text-gray-800 font-medium">{selectedCountry.code}</span></button>
                {showCountryDropdown && (<div className="absolute top-full left-0 mt-2 bg-white border rounded-xl shadow-lg z-50 w-80 max-h-72 overflow-y-auto"><div className="p-2 sticky top-0 bg-white border-b"><Input type="text" placeholder="Search country or code..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" /></div><ul className="py-1">{filteredCountries.length > 0 ? (filteredCountries.map((country, index) => (<li key={`${country.name}-${country.code}-${index}`}><button type="button" onClick={() => handleSelectCountry(country)} className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-3 text-sm"><span className="text-xl">{country.flag}</span><span className="text-gray-800 font-medium">{country.name}</span><span className="text-gray-500 ml-auto">{country.code}</span></button></li>))) : (<li className="px-3 py-2 text-sm text-gray-500 text-center">No countries found.</li>)}</ul></div>)}
              </div>
              <div className="h-8 w-px bg-gray-200"></div>
              <Input type="tel" placeholder={selectedCountry.placeholder} value={phoneNumber} onChange={handlePhoneInputChange} className="flex-1 h-14 text-lg border-none bg-transparent focus:ring-0" />
            </div>
            
            <Button onClick={handleStartLoadingProcess} disabled={!phoneNumber.trim() || isLoadingPhoto || isLoadingStarted} className="w-full h-16 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-3 disabled:bg-green-400 disabled:cursor-not-allowed"><Lock className="h-6 w-6" /> Clone WhatsApp Now</Button>
            
            {photoError && <p className="text-red-500 text-sm -mt-4">{photoError}</p>}
            
          </div>

          {isLoadingStarted && (
            <div className="w-full mt-8 animate-fade-in">
              {!isCompleted ? (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mb-3">
                      {isLoadingPhoto ? <Loader2 className="h-8 w-8 text-gray-500 animate-spin" /> : profilePhoto ? <Image src={profilePhoto || "/placeholder.svg"} alt="WhatsApp Profile" width={64} height={64} className="object-cover h-full w-full" unoptimized onError={() => setProfilePhoto("/placeholder.svg")} /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg mb-1">{isPhotoPrivate ? "Target Profile" : "WhatsApp Profile"}</h3>
                      <p className="text-gray-600 mb-2">{localStorage.getItem("phoneNumber")}</p>
                      <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm"><MapPin className="h-4 w-4" /><span>{location?.city || "..."}</span></div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium text-sm">{currentSteps[currentStepIndex]?.text || "Connecting..."}</span>
                      <span className="text-green-600 font-bold text-sm">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-green-500 h-2.5 rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div></div>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {currentSteps.slice(0, visibleSteps).map((step) => (<div key={step.id} className={`flex items-start gap-3 text-sm`}><div className="flex-shrink-0 w-4 h-4 mt-0.5">{step.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : step.status === "completed" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <div className="h-3.5 w-3.5 mt-px rounded-full border-2 border-gray-300"></div>}</div><span className={`transition-colors duration-300 ${step.status === "completed" ? "text-green-600 font-medium" : step.status === "loading" ? "text-blue-600 font-medium" : "text-gray-600"}`}>{step.text}</span></div>))}
                  </div>
                </div>
              ) : (
                <div className="text-left animate-fade-in">
                  <div className="bg-green-500 text-white text-center py-4 rounded-t-lg"><h1 className="text-xl font-bold">WhatsApp Access Report</h1><p className="text-sm opacity-90">Analysis of the personal mobile</p></div>
                  <div className="bg-white p-4 space-y-6 rounded-b-lg shadow-md">
                    <div className="bg-white rounded-lg p-4 border border-gray-200"><h2 className="text-lg font-semibold text-gray-800 mb-2">Conversation Analysis</h2><p className="text-sm text-gray-600 mb-4"><span className="font-semibold text-red-500">148 suspicious conversations</span> were found. The system recovered <span className="font-semibold text-orange-500">deleted messages</span>.</p><div className="space-y-3">{reportConversations.map((convo, index) => (<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => setSelectedConvoIndex(index)}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full overflow-hidden"><Image src={convo.img || "/placeholder.svg"} alt="Profile" width={32} height={32} /></div><div><p className="font-medium text-sm">{convo.name}</p><p className="text-xs text-gray-500">{convo.msg}</p></div></div><span className="text-xs text-gray-400">{convo.time}</span></div>))}</div></div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200"><h2 className="text-lg font-semibold text-gray-800 mb-2">Recovered Media</h2><p className="text-sm text-gray-600 mb-4"><span className="font-semibold text-red-500">247 deleted photos</span> were found that may contain sensitive content.</p><div className="grid grid-cols-3 gap-3">{reportMedia.map((image, index) => (<div key={index} className="aspect-square relative rounded-lg overflow-hidden"><Image src={image || "/placeholder.svg"} alt={`Recovered media ${index + 1}`} fill className="object-cover" /></div>))}</div></div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200"><h2 className="text-lg font-semibold text-gray-800 mb-2">Suspicious Keywords</h2><p className="text-sm text-gray-600 mb-4">The system scanned <span className="font-semibold text-red-500">4,327 messages</span> and identified several keywords.</p><div className="space-y-1">{suspiciousKeywords.map((item, index) => (<div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0"><span className="text-lg text-gray-800">"{item.word}"</span><div className="flex items-center justify-center w-7 h-7 bg-green-500 rounded-full text-white text-sm font-bold">{item.count}</div></div>))}</div></div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200"><h2 className="text-lg font-semibold text-gray-800 mb-2">Suspicious Location</h2><p className="text-sm text-gray-600 mb-4">The device location was tracked. Check below:</p>{isLoadingLocation ? <div className="text-center p-10 h-96 flex items-center justify-center"><p>Detecting location...</p></div> : <RealtimeMap lat={location?.lat ?? defaultLocation.lat} lng={location?.lng ?? defaultLocation.lng} city={location?.city ?? defaultLocation.city} country={location?.country ?? defaultLocation.country} />}</div>
                    
                    <div className="bg-white p-5 rounded-lg shadow-xl text-center border border-gray-200">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center mb-4">
                        <LockOpen className="text-white" size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800"><span className="text-yellow-600">🔓</span> UNLOCK COMPLETE REPORT</h2>
                      <p className="text-gray-600 mt-1">Get instant access to the full report with all conversations, including archived or deleted ones</p>

                      <div className="bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-lg mt-5">
                        <div className="flex items-center justify-center gap-2"><AlertTriangle className="text-red-600" /><h3 className="font-bold">THE REPORT WILL BE DELETED IN:</h3></div>
                        <p className="text-4xl font-mono font-bold my-1 text-red-600">{formatTime(timeLeft)}</p>
                        <p className="text-xs text-red-700">After the time expires, this report will be permanently deleted for privacy reasons. This offer cannot be recovered at a later date.</p>
                      </div>
                      
                      <div id="hotmart-sales-funnel" className="w-full pt-4"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoadingStarted && (
            <div className="space-y-3 w-full">
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /><span className="text-gray-700 text-sm">(312) 995-XX31 had conversations exposed!</span></div>
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /><span className="text-gray-700 text-sm">(213) 983-XX50 from Los Angeles was granted monitoring access!</span></div>
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /><span className="text-gray-700 text-sm">(305) 938-XX71 had messages intercepted!</span></div>
            </div>
          )}
        </main>
      </div>
      {selectedConvoIndex !== null && <ChatPopup onClose={() => setSelectedConvoIndex(null)} profilePhoto={reportConversations[selectedConvoIndex].img} conversationData={reportConversations[selectedConvoIndex].chatData} conversationName={reportConversations[selectedConvoIndex].popupName} />}
    </>
  )
}
