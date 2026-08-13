// Wrapper sederhana untuk Shadcn toast agar bisa diimport langsung
// tanpa perlu useToast dari setiap komponen

import { toast as sonnerToast } from 'sonner'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function toast({ title, description, variant }: ToastOptions) {
  if (variant === 'destructive') {
    sonnerToast.error(title, { description })
  } else {
    sonnerToast.success(title, { description })
  }
}
