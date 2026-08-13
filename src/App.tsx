import { Toaster } from 'sonner'
import AppRoutes from '@/routes/AppRoutes'

export default function App() {
  return (
    <>
      <AppRoutes />

      {/* Global toast notifications */}
      <Toaster
        position="bottom-right"
        theme="light"
        richColors
        closeButton
      />
    </>
  )
}
