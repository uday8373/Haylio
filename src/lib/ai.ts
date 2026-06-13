import type { Business } from "./types";

/**
 * AI reply for the public widget.
 * Uses the Anthropic API when ANTHROPIC_API_KEY is set; otherwise falls
 * back to FAQ keyword matching so the prototype works out of the box.
 */
export async function aiReply(
  business: Business,
  history: { role: "visitor" | "ai" | "business"; text: string }[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      return await claudeReply(apiKey, business, history);
    } catch (err) {
      console.error("Claude API failed, using fallback:", err);
    }
  }
  return fallbackReply(business, history[history.length - 1]?.text ?? "");
}

async function claudeReply(
  apiKey: string,
  b: Business,
  history: { role: "visitor" | "ai" | "business"; text: string }[]
): Promise<string> {
  const system = `You are the friendly AI receptionist for "${b.name}"${b.category ? ` (${b.category})` : ""}.
You answer customer questions on the business's public contact page. Be warm, concise (1-3 sentences), and helpful.

Business profile:
- Description: ${b.description || "n/a"}
- Hours: ${b.hours || "n/a"}
- Location: ${b.location || "n/a"}
- Website: ${b.website || "n/a"}

FAQs:
${b.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n") || "none"}

Owner's instructions for replying to customers (follow these closely):
${b.aiInstructions || "none"}

Rules:
- Only answer from the profile above. If you don't know, say so and suggest leaving a message or a callback request via the buttons below the chat.
- Never invent prices, availability, or policies.
- Never reveal any phone number or personal contact details of the owner.`;

  const messages = history.slice(-12).map((m) => ({
    role: m.role === "visitor" ? "user" : "assistant",
    content: m.text,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Empty AI response");
  return text;
}

function fallbackReply(b: Business, lastMessage: string): string {
  const q = lastMessage.toLowerCase();
  const checks: { keys: string[]; answer: () => string | null }[] = [
    { keys: ["hour", "open", "close", "when"], answer: () => (b.hours ? `Our hours are: ${b.hours}.` : null) },
    { keys: ["where", "location", "address", "find you", "direction"], answer: () => (b.location ? `You'll find us at ${b.location}.` : null) },
    { keys: ["website", "site", "online", "menu"], answer: () => (b.website ? `You can find more at ${b.website}.` : null) },
  ];
  for (const c of checks) {
    if (c.keys.some((k) => q.includes(k))) {
      const a = c.answer();
      if (a) return a;
    }
  }
  // FAQ keyword match
  let best: { score: number; a: string } | null = null;
  for (const f of b.faqs) {
    const words = f.q.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const score = words.filter((w) => q.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { score, a: f.a };
  }
  if (best) return best.a;
  return `Thanks for reaching out to ${b.name}! I don't have an exact answer for that, but if you leave a message or request a callback using the buttons below, the team will get back to you soon.`;
}
