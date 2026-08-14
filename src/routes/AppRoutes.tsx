import { Routes, Route, Navigate } from 'react-router-dom'
import Login from '@/pages/Login'
import Daftar from '@/pages/Daftar'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import StatusPage from '@/pages/StatusPage'
import Dashboard from '@/pages/Dashboard'
import CashflowWarga from '@/pages/CashflowWarga'
import CCTV from '@/pages/CCTV'
import RequestSurat from '@/pages/RequestSurat'
import BayarIuran from '@/pages/warga/BayarIuran'
import Profile from '@/pages/Profile'
import Threads from '@/pages/warga/Threads'
import ReviewIuran from '@/pages/bendahara/ReviewIuran'
import KelolaKas from '@/pages/bendahara/KelolaKas'
import Konfigurasi from '@/pages/bendahara/Konfigurasi'
import MasterDataWarga from '@/pages/admin/MasterDataWarga'
import VerifikasiWarga from '@/pages/admin/VerifikasiWarga'
import SuratMenyurat from '@/pages/admin/SuratMenyurat'
import BuatPengumuman from '@/pages/humas/BuatPengumuman'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import CashflowPublic from '@/pages/CashflowPublic'

function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-5xl">🚫</p>
        <h1 className="text-xl font-bold">Akses Ditolak</h1>
        <p className="text-slate-500 text-sm">
          Anda tidak memiliki izin untuk mengakses halaman ini.
        </p>
        <a href="/" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Kembali ke Dashboard
        </a>
      </div>
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ─── Public routes ─── */}
      <Route path="/login" element={<Login />} />
      <Route path="/daftar" element={<Daftar />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pending-approval" element={<StatusPage type="pending" />} />
      <Route path="/rejected" element={<StatusPage type="ditolak" />} />
      <Route path="/pindah" element={<StatusPage type="pindah" />} />
      {/* Path lama (backward compat) */}
      <Route path="/status/pending" element={<StatusPage type="pending" />} />
      <Route path="/status/ditolak" element={<StatusPage type="ditolak" />} />
      <Route path="/status/pindah" element={<StatusPage type="pindah" />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ─── Protected: dibungkus AppLayout (auth + status warga) ─── */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Semua role aktif */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/cashflow/warga" element={<CashflowWarga />} />
        <Route path="/cashflow/public" element={<CashflowPublic />} />
        <Route path="/cctv" element={<CCTV />} />
        <Route path="/surat" element={<RequestSurat />} />
        <Route path="/bayar-iuran" element={<BayarIuran />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/threads" element={<Threads />} />

        {/* Bendahara & Ketua RT */}
        <Route
          path="/bendahara/iuran"
          element={
            <ProtectedRoute allowedRoles={['bendahara', 'ketua_rt']}>
              <ReviewIuran />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kas"
          element={
            <ProtectedRoute allowedRoles={['bendahara', 'ketua_rt']}>
              <KelolaKas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/konfigurasi"
          element={
            <ProtectedRoute allowedRoles={['bendahara', 'ketua_rt']}>
              <Konfigurasi />
            </ProtectedRoute>
          }
        />

        {/* Sekretaris & Ketua RT */}
        <Route
          path="/admin/warga"
          element={
            <ProtectedRoute allowedRoles={['sekretaris', 'ketua_rt']}>
              <MasterDataWarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verifikasi"
          element={
            <ProtectedRoute allowedRoles={['sekretaris', 'ketua_rt']}>
              <VerifikasiWarga />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/surat"
          element={
            <ProtectedRoute allowedRoles={['sekretaris', 'ketua_rt']}>
              <SuratMenyurat />
            </ProtectedRoute>
          }
        />

        {/* Humas & Ketua RT */}
        <Route
          path="/humas/pengumuman"
          element={
            <ProtectedRoute allowedRoles={['humas', 'ketua_rt']}>
              <BuatPengumuman />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
