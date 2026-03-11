import { createContext, useContext } from 'react'

/**
 * Images: [{ cellId, name, url?, src? }].
 * - cellId: block id. name: e.g. "hello-world.jpg".
 * - url: server location (persisted when saving/loading). Set this when your backend returns a URL after upload.
 * - src: in-memory preview only (e.g. data URL); never persisted — use for display until backend returns url.
 */
export const CellImagesContext = createContext({
    images: [],
    onAddImage: () => {},
})

export function useCellImages() {
    return useContext(CellImagesContext)
}
