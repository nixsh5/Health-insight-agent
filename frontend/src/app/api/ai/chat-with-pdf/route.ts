import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Mode = "auto" | "agent 1" | "agent 2"

const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions"
const MODEL_AGENT_1 = "google/gemma-2-2b-it:nebius" // Agent 1 (HF)

const LOCAL_OPENAI_BASE = process.env.LOCAL_OPENAI_BASE || "http://localhost:11434/v1"
// Use your Ollama model/tag for Agent 2:
const LOCAL_MODEL = process.env.LOCAL_MODEL || "deepseek-v2:latest"

/** AUTO heuristic; swap to random if preferred */
function pickAuto(doc: string): "cloud" | "local" {
    return doc && doc.length > 10_000 ? "local" : "cloud"
}

export async function POST(req: Request) {
    console.log("Route was called")
    try {
        const body = await req.json().catch(() => ({ query: "", text: "", mode: "auto" }))
        const { query, text, mode } = body as { query?: string; text?: string; mode?: Mode }

        if (!query || typeof query !== "string") {
            return NextResponse.json({ message: "Missing query" }, { status: 400 })
        }

        const docSnippet = (text ?? "").slice(0, 20000)
        const userMessage = docSnippet ? `Document content:\n${docSnippet}\n\nQuestion: ${query}` : query

        let target: "cloud" | "local"
        if (mode === "agent 1") target = "cloud"
        else if (mode === "agent 2") target = "local"
        else target = pickAuto(text ?? "")

        if (target === "cloud") {
            const hfToken = process.env.HUGGINGFACE_API_TOKEN
            if (!hfToken) {
                return NextResponse.json({ message: "Missing HUGGINGFACE_API_TOKEN" }, { status: 500 })
            }

            const payload = {
                model: MODEL_AGENT_1,
                messages: [{ role: "user", content: userMessage }],
                max_tokens: 256,
                temperature: 0.7,
            }

            const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${hfToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            })

            if (!resp.ok) {
                const t = await resp.text().catch(() => "")
                console.error("HF Router chat completions failed", { status: resp.status, body: t })
                return NextResponse.json({ message: "AI API error: " + (t || resp.statusText) }, { status: 502 })
            }

            const data = (await resp.json()) as {
                choices?: Array<{ message?: { content?: string }; text?: string }>
                generated_text?: string
                answer?: string
            }

            const answer =
                data?.choices?.[0]?.message?.content ??
                data?.choices?.[0]?.text ??
                data?.generated_text ??
                data?.answer ??
                ""

            return NextResponse.json({ generated_text: answer, model: MODEL_AGENT_1, mode: mode ?? "auto", target })
        }

        // target === "local" → Ollama OpenAI-compatible endpoint
        const localPayload = {
            model: LOCAL_MODEL,
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 256,
            temperature: 0.7,
        }

        const localResp = await fetch(`${LOCAL_OPENAI_BASE}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(localPayload),
        })

        if (!localResp.ok) {
            const t = await localResp.text().catch(() => "")
            console.error("Local model error", { status: localResp.status, body: t })
            return NextResponse.json({ message: "Local AI error: " + (t || localResp.statusText) }, { status: 502 })
        }

        const localData = (await localResp.json()) as {
            choices?: Array<{ message?: { content?: string } }>
        }

        const localAnswer = localData?.choices?.[0]?.message?.content ?? ""

        return NextResponse.json({
            generated_text: localAnswer,
            model: LOCAL_MODEL,
            mode: mode ?? "auto",
            target: "local",
        })
    } catch (err) {
        const error = err as Error
        console.error(error)
        return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 })
    }
}
