import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Wallet,
  Cctv,
  FileText,
  BadgeCheck,
  Landmark,
  Users,
  UserCheck,
  FolderOpen,
  Megaphone,
  Settings,
  Menu,
  X,
  LogOut,
  Shield,
  Home,
  UserRound,
  MessageSquare,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/types/database.types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ─── Role metadata ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  warga: 'Warga',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  humas: 'Humas',
  ketua_rt: 'Ketua RT',
}

const ROLE_BADGE: Record<Role, string> = {
  warga: 'bg-slate-100 text-slate-600 border-slate-300',
  bendahara: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sekretaris: 'bg-blue-50 text-blue-700 border-blue-200',
  humas: 'bg-purple-50 text-purple-700 border-purple-200',
  ketua_rt: 'bg-amber-50 text-amber-700 border-amber-200',
}

// ─── Menu configuration ───────────────────────────────────────────────────────

interface MenuItem {
  to: string
  label: string
  icon: ReactNode
  roles?: Role[] // kosong = semua role aktif
  badgeKey?: 'verifikasi' | 'iuran' | 'surat'
}

interface MenuSection {
  title: string
  items: MenuItem[]
  roles?: Role[]
}

const ALL_ROLES: Role[] = ['warga', 'bendahara', 'sekretaris', 'humas', 'ketua_rt']

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Utama',
    items: [
      { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { to: '/cashflow/warga', label: 'Cashflow Warga', icon: <Wallet className="w-4 h-4" /> },
      { to: '/cashflow/public', label: 'Cashflow RT', icon: <Wallet className="w-4 h-4" /> },
      { to: '/cctv', label: 'Pantau CCTV', icon: <Cctv className="w-4 h-4" /> },
      { to: '/bayar-iuran', label: 'Bayar Iuran', icon: <BadgeCheck className="w-4 h-4" /> },
      { to: '/surat', label: 'Request Surat', icon: <FileText className="w-4 h-4" /> },
      { to: '/profile', label: 'Profil Saya', icon: <UserRound className="w-4 h-4" /> },
      { to: '/threads', label: 'Thread Warga', icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Keuangan',
    roles: ['bendahara', 'ketua_rt'],
    items: [
      { to: '/bendahara/iuran', label: 'Review Pembayaran Iuran', icon: <BadgeCheck className="w-4 h-4" />, badgeKey: 'iuran' },
      { to: '/kas', label: 'Kelola Kas', icon: <Landmark className="w-4 h-4" /> },
      { to: '/konfigurasi', label: 'Konfigurasi', icon: <Settings className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Admin',
    roles: ['sekretaris', 'ketua_rt'],
    items: [
      { to: '/admin/warga', label: 'Master Data Warga', icon: <Users className="w-4 h-4" /> },
      { to: '/admin/verifikasi', label: 'Verifikasi Warga Baru', icon: <UserCheck className="w-4 h-4" />, badgeKey: 'verifikasi' },
      { to: '/admin/surat', label: 'Surat Menyurat', icon: <FolderOpen className="w-4 h-4" />, badgeKey: 'surat' },
    ],
  },
  {
    title: 'Komunikasi',
    roles: ['humas', 'ketua_rt'],
    items: [
      { to: '/humas/pengumuman', label: 'Kelola Pengumuman', icon: <Megaphone className="w-4 h-4" /> },
    ],
  },
]

function canAccess(role: Role | undefined, roles?: Role[]): boolean {
  if (!role) return false
  return roles ? roles.includes(role) : ALL_ROLES.includes(role)
}

// ─── Badge count untuk menu ───────────────────────────────────────────────────

export interface MenuBadges {
  verifikasi: number
  iuran: number
  surat: number
}

async function fetchCount(
  table: 'profiles' | 'contributions' | 'letters',
  column: string,
  value: string
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(column, value)
  if (error) throw new Error(error.message)
  return count ?? 0
}

/**
 * Ambil jumlah item "pending" untuk badge sidebar.
 * Hanya query tabel yang relevan sesuai role pengguna.
 */
function useMenuBadgeCounts(role: Role | undefined): MenuBadges {
  const adminRoles = ['sekretaris', 'ketua_rt']
  const bendaharaRoles = ['bendahara', 'ketua_rt']
  const isAdmin = role ? adminRoles.includes(role) : false
  const isBendahara = role ? bendaharaRoles.includes(role) : false

  const verifikasi = useQuery({
    queryKey: ['menu-badges', 'verifikasi'],
    queryFn: () => fetchCount('profiles', 'status_warga', 'pending'),
    enabled: isAdmin,
    staleTime: 1000 * 30,
  })

  const surat = useQuery({
    queryKey: ['menu-badges', 'surat'],
    queryFn: () => fetchCount('letters', 'status', 'pending'),
    enabled: isAdmin,
    staleTime: 1000 * 30,
  })

  const iuran = useQuery({
    queryKey: ['menu-badges', 'iuran'],
    queryFn: () => fetchCount('contributions', 'status_pembayaran', 'pending'),
    enabled: isBendahara,
    staleTime: 1000 * 30,
  })

  return {
    verifikasi: verifikasi.data ?? 0,
    iuran: iuran.data ?? 0,
    surat: surat.data ?? 0,
  }
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
        <Home className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-900 font-bold text-sm leading-tight truncate">Portal RT</p>
        <p className={`text-slate-500 leading-tight truncate ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          Manajemen Rukun Tetangga
        </p>
      </div>
    </div>
  )
}

function SidebarNav({
  role,
  onNavigate,
  badges,
}: {
  role: Role | undefined
  onNavigate?: () => void
  badges: MenuBadges
}) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 min-h-0">
      {MENU_SECTIONS.map((section) => {
        if (!canAccess(role, section.roles)) return null
        const items = section.items.filter((item) => canAccess(role, item.roles))
        if (items.length === 0) return null

        return (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-blue-500 transition-opacity ${
                          isActive ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {item.badgeKey && badges[item.badgeKey] > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold leading-none">
                          {badges[item.badgeKey] > 99 ? '99+' : badges[item.badgeKey]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function SidebarShell({
  role,
  onNavigate,
  closeButton,
  badges,
}: {
  role: Role | undefined
  onNavigate?: () => void
  closeButton?: React.ReactNode
  badges: MenuBadges
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center justify-between gap-2 px-5 h-16 border-b border-slate-200 shrink-0">
        <Brand />
        {closeButton}
      </div>

      {/* Nav */}
      <SidebarNav role={role} onNavigate={onNavigate} badges={badges} />

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
          <Shield className="w-4 h-4 text-slate-500 shrink-0" />
          <p className="text-slate-500 text-[11px]">Portal RT · v1.0</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const badges = useMenuBadgeCounts(profile?.role)

  // Tutup drawer saat pindah halaman (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Tentukan judul halaman dari menu yang aktif
  const currentLabel = MENU_SECTIONS.flatMap((s) => s.items).find(
    (item) => item.to === location.pathname
  )?.label

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const inisial = profile?.nama_lengkap
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-clip">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white z-40">
        <SidebarShell role={profile?.role} badges={badges} />
      </aside>

      {/* ── Sidebar Mobile (drawer) ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-slate-200 bg-white z-10 shadow-2xl overflow-hidden">
            <SidebarShell
              role={profile?.role}
              onNavigate={() => setSidebarOpen(false)}
              badges={badges}
              closeButton={
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              }
            />
          </aside>
        </div>
      )}

      {/* ── Konten utama ── */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
          {/* Kiri: burger (mobile) + judul */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-700 hover:bg-slate-100"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {currentLabel ?? 'Dashboard'}
            </h1>
          </div>

          {/* Kanan: user + logout */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/profile"
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-slate-50"
              title="Buka profil"
            >
              <Avatar className="w-9 h-9 border border-slate-200 bg-blue-600/30">
                <AvatarFallback className="bg-blue-600/30 text-blue-200 text-xs font-bold">
                  {inisial}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900 leading-tight">
                  {profile?.nama_lengkap ?? 'User'}
                </p>
                <Badge
                  variant="outline"
                  className={`mt-0.5 px-2 py-0 text-[10px] font-medium ${profile ? ROLE_BADGE[profile.role] : ''}`}
                >
                  {profile ? ROLE_LABELS[profile.role] : '—'}
                </Badge>
              </div>
            </NavLink>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-red-500/15 hover:text-red-700 hover:border-red-500/40"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Outlet halaman */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
