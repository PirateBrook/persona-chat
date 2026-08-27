/**
 * The extension's own Chrome Web Store listing. The id is the published item
 * id (the same EXTENSION_ID as in `.env.publish.local`) — stable for the life
 * of the listing, so a literal is fine here; if the item is ever republished
 * under a new id this is the only line that changes.
 *
 * `/reviews` deep-links to the review pane rather than the overview tab, so
 * the rating prompt lands one click away from actually writing one. Opening
 * it is a plain `target="_blank"` link — no network call from the extension,
 * same posture as the chub.ai and feedback links.
 */
const EXTENSION_ID = "dnhkhannanbilnhheeplibglpndccgic"

export const STORE_REVIEWS_URL = `https://chromewebstore.google.com/detail/${EXTENSION_ID}/reviews`
