/**
 * Downscales and re-encodes an uploaded image client-side before it ever
 * touches chrome.storage.local. A phone photo can be several MB raw — this
 * caps the dimension a background ever needs (nothing here renders larger
 * than a browser viewport) and re-encodes as JPEG, which keeps every
 * uploaded background a few hundred KB regardless of source size.
 */
export function resizeImageFile(file: File, maxDim = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read_failed"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode_failed"))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("canvas_unavailable"))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
