import { Construction } from 'lucide-react'

interface PagePlaceholderProps {
  title: string
  description?: string
}

/**
 * Halaman placeholder untuk fitur yang belum diimplementasikan.
 * Akan diganti dengan halaman fungsional di tahap berikutnya.
 */
export default function PagePlaceholder({
  title,
  description = 'Modul ini sedang dalam pengembangan dan akan segera tersedia.',
}: PagePlaceholderProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto bg-blue-500/10 border border-blue-200 rounded-2xl flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
