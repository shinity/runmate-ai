import { create } from 'zustand'

interface GalleryState {
  // routeArtUrl이 있는 런 ID 목록 (갤러리에서 탐색 시 사용)
  routeArtIds: string[]
  setRouteArtIds: (ids: string[]) => void
}

export const useGalleryStore = create<GalleryState>((set) => ({
  routeArtIds: [],
  setRouteArtIds: (ids) => set({ routeArtIds: ids }),
}))
