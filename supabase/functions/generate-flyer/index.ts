// ============================================================
// Edge Function: generate-flyer
// Menghasilkan flyer/poster pengumuman menggunakan OpenAI DALL-E 3
// Payload: { judul, agenda, kategori }
// Output : { url: string } — URL publik gambar di Supabase Storage
// ============================================================

import OpenAI from 'npm:openai@4'
import { createClient } from 'npm:@supabase/supabase-js'

const BUCKET_NAME = 'announcement-flyers'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface GenerateFlyerPayload {
  judul: string
  agenda: string
  kategori: string
}

function buildPrompt({ judul, agenda, kategori }: GenerateFlyerPayload): string {
  const kategoriLabel = kategori || 'umum'
  return [
    'Buatkan desain poster/flyer pengumuman warga lingkungan RT dalam bahasa Indonesia.',
    '',
    `Judul: "${judul || 'Pengumuman RT'}"`,
    `Kategori: ${kategoriLabel}`,
    `Isi/detail: ${agenda || 'Informasi kegiatan lingkungan RT'}`,
    '',
    'Spesifikasi desain:',
    '- Gaya visual modern, bersih, dan profesional.',
    '- Teks judul besar dan jelas agar mudah dibaca.',
    '- Tidak ada teks yang salah ketik atau tidak relevan.',
    '- Hindari memuat nama, alamat, nomor kontak, atau data pribadi secara spesifik.',
    '- Cocok untuk dipajang di papan informasi warga.',
  ].join('\n')
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'pengumuman'
  ).slice(0, 50)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

Deno.serve(async (req) => {
  // Tangani preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method tidak diizinkan' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!openAiKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Konfigurasi server tidak lengkap' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = (await req.json()) as Partial<GenerateFlyerPayload>
    const judul = (body.judul ?? '').trim()
    const agenda = (body.agenda ?? '').trim()
    const kategori = (body.kategori ?? 'umum').trim()

    if (!judul || !agenda) {
      return new Response(
        JSON.stringify({ error: 'Judul dan agenda wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const openai = new OpenAI({ apiKey: openAiKey })

    const prompt = buildPrompt({ judul, agenda, kategori })

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'b64_json',
    })

    const b64 = response.data[0]?.b64_json
    if (!b64) {
      return new Response(
        JSON.stringify({ error: 'OpenAI tidak mengembalikan gambar' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const filePath = `${Date.now()}-${slugify(judul)}.png`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, base64ToBytes(b64), {
        contentType: 'image/png',
        upsert: false,
      })

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: `Gagal menyimpan flyer: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    return new Response(JSON.stringify({ url: publicData.publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Terjadi kesalahan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
