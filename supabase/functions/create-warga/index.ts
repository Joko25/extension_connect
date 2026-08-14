// ============================================================
// Edge Function: create-warga
// Membuat akun warga baru secara otomatis (UUID akun & profil
// di-generate di sisi server) oleh admin (sekretaris/ketua_rt).
// Payload : { email, password, nama_lengkap, nik, no_kk, no_hp }
// Output  : { userId, profileId }
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Konfigurasi server tidak lengkap' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Tidak terautentikasi' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validasi pelaku: harus sekretaris / ketua_rt
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const caller = await serviceClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!caller.data.user) {
      return new Response(
        JSON.stringify({ error: 'Token tidak valid' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('user_id', caller.data.user.id)
      .maybeSingle()

    if (!callerProfile || !['sekretaris', 'ketua_rt'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Anda tidak memiliki izin untuk menambah warga' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const email = (body.email ?? '').trim()
    const password = (body.password ?? '') as string
    const namaLengkap = (body.nama_lengkap ?? '').trim()
    const nik = (body.nik ?? '').trim()
    const noKk = (body.no_kk ?? '').trim()
    const noHp = (body.no_hp ?? '').trim() || null

    if (!email || !password || !namaLengkap || !nik || !noKk) {
      return new Response(
        JSON.stringify({ error: 'Data warga belum lengkap' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Buat akun auth → trigger on_auth_user_created membuat profil
    const { data: userData, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nama_lengkap: namaLengkap, nik, no_kk: noKk, no_hp: noHp },
    })

    if (createError) {
      const status = createError.message?.toLowerCase().includes('already')
        ? 409
        : 400
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = userData.user.id

    // 2. Aktifkan profil (trigger membuatnya dengan status pending)
    const { data: profData, error: profError } = await serviceClient
      .from('profiles')
      .update({ status_warga: 'aktif', no_hp: noHp })
      .eq('user_id', userId)
      .select('id')
      .single()

    if (profError || !profData) {
      await serviceClient.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: profError?.message ?? 'Gagal membuat profil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ userId, profileId: profData.id }), {
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