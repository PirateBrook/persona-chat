// Cloudflare Pages Function — POST /api/feedback
//
// Deliberately has no database: each submission is relayed as a single
// message to a webhook (Discord or Slack) configured via the
// FEEDBACK_WEBHOOK_URL secret. Nothing is stored at rest — if that's ever
// wrong for the volume this gets, add storage then, not before.
export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400)
  }

  // Honeypot: real users never see or fill this field (see index.html's
  // .honeypot class). Accept silently so a bot can't tell it was dropped.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json({ ok: true })
  }

  const reason = typeof body.reason === "string" ? body.reason.slice(0, 64) : "other"
  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p) => typeof p === "string").slice(0, 8)
    : []
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : ""
  const source = body.source === "uninstall" ? "uninstall" : "inapp"
  const lang = body.lang === "zh" ? "zh" : "en"

  const webhookUrl = env.FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) {
    return json({ ok: false, error: "not_configured" }, 500)
  }

  const lines = [
    `**Persona.chat feedback** (${source}, ${lang})`,
    `Reason: ${reason}`,
    platforms.length ? `Platforms: ${platforms.join(", ")}` : null,
    comment ? `Comment: ${comment}` : null
  ].filter(Boolean)
  const message = lines.join("\n")

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Both keys on purpose: Discord webhooks read `content`, Slack
      // incoming webhooks read `text` — each ignores the field it doesn't
      // recognize, so the same payload works with either. Only the secret
      // value changes depending on which one you set up.
      body: JSON.stringify({ content: message, text: message })
    })
  } catch {
    return json({ ok: false, error: "relay_failed" }, 502)
  }

  return json({ ok: true })
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  })
}
