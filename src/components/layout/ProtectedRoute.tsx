import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, hasRole } from '@/context/AuthContext'
import type { Role } from '@/types/database.types'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  /** Roles yang diizinkan mengakses route ini. Kosong = semua role yang aktif boleh akses */
  allowedRoles?: Role[]
  children?: React.ReactNode
}

/**
 * ProtectedRoute — Wrapper pembatas akses halaman berdasarkan:
 *   a. Status Auth (harus sudah login)
 *   b. Status warga ('pending' → /pending-approval, 'menolak' → /rejected)
 *   c. Role (jika allowedRoles diberikan dan user tidak berhak → /unauthorized)
 *
 * Bisa membungkus children (biasanya <AppLayout/>) atau bertindak sebagai
 * layout route dengan <Outlet/> bila dipakai tanpa children.
 */
export default function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth()
  const location = useLocation()

  // Loading state — spinner saat cek session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Memeriksa sesi...</p>
        </div>
      </div>
    )
  }

  // a. Belum login → redirect ke login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // b. Profil belum dimuat (rare case)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // b. Status warga 'pending' → halaman menunggu persetujuan
  if (profile.status_warga === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  // b. Status warga 'menolak' → halaman ditolak
  if (profile.status_warga === 'menolak') {
    return <Navigate to="/rejected" replace />
  }

  // b. Status warga 'pindah' → halaman pindah (akun non-aktif)
  if (profile.status_warga === 'pindah') {
    return <Navigate to="/pindah" replace />
  }

  // c. Cek role jika halaman butuh role khusus
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(profile.role, allowedRoles)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children ? <>{children}</> : <Outlet />
}
