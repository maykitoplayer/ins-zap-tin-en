// app/api/location/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Em ambiente de desenvolvimento (localhost), os cabeçalhos da Vercel não existem.
  // Então, retornamos uma localização padrão para testes.
  if (process.env.NODE_ENV === 'development') {
    console.log("Ambiente de desenvolvimento: retornando localização de São Paulo.");
    return NextResponse.json({
      status: 'success',
      city: 'São Paulo',
      country: 'Brazil',
      lat: -23.5505,
      lon: -46.6333, // A resposta precisa ser 'lon' para bater com o frontend.
    });
  }

  // Em produção na Vercel, lemos os cabeçalhos que a Vercel injeta.
  try {
    const city = request.headers.get('x-vercel-ip-city');
    const country = request.headers.get('x-vercel-ip-country');
    const lat = request.headers.get('x-vercel-ip-latitude');
    const lon = request.headers.get('x-vercel-ip-longitude');

    // Verificação de segurança: se algum header estiver faltando, retorna erro.
    if (!city || !country || !lat || !lon) {
      console.error("Cabeçalhos de geolocalização da Vercel não foram encontrados em produção.");
      throw new Error("Cabeçalhos da Vercel ausentes.");
    }
    
    // Retorna os dados da localização lidos diretamente dos cabeçalhos.
    return NextResponse.json({
      status: 'success',
      city,
      country,
      lat: parseFloat(lat), // Converte a string para número
      lon: parseFloat(lon), // Converte a string para número
    });

  } catch (error: any) {
    console.error("Erro ao processar cabeçalhos da Vercel:", error.message);
    return NextResponse.json(
      { error: 'Erro interno ao processar a geolocalização da Vercel.' },
      { status: 500 }
    );
  }
}
