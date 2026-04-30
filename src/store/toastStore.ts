import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

interface ToastState {
  toasts: Toast[]
  pushToast: (message: string, kind?: ToastKind) => void
  dismissToast: (id: string) => void
}

const AUTO_DISMISS_MS = 4000

// Module-scoped counter so IDs are unique even when toasts are pushed in
// the same millisecond.
let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (message, kind = 'info') => {
    const id = `toast-${Date.now()}-${nextId++}`
    set((state) => ({ toasts: [...state.toasts, { id, message, kind }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, AUTO_DISMISS_MS)
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
