import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    console.log("Route was called")
    try {
        const body = await req.json().catch(() => ({ query: "", text: "" }))
        const { query, text } = body as { query?: string; text?: string }

        if (!query || typeof query !== "string") {
            return NextResponse.json({ message: "Missing query" }, { status: 400 })
        }

        const hfToken = process.env.HUGGINGFACE_API_TOKEN
        if (!hfToken) {
            return NextResponse.json({ message: "Missing HUGGINGFACE_API_TOKEN" }, { status: 500 })
        }

        const userMessage = text
            ? `Document content:\n${text}\n\nQuestion: ${query}`
            : query

        const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemma-2-2b-it:nebius",
                messages: [{ role: "user", content: userMessage }],
                max_tokens: 256,
                temperature: 0.7,
            }),
        })

        if (!resp.ok) {
            const t = await resp.text()
            console.error("HF Router chat completions failed", { status: resp.status, body: t })
            return NextResponse.json({ message: "AI API error: " + t }, { status: 502 })
        }

        const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> }
        const answer = data.choices?.[0]?.message?.content || JSON.stringify(data)
        return NextResponse.json({ generated_text: answer })
    } catch (err) {
        const error = err as Error
        console.error(error)
        return NextResponse.json({ message: error?.message || "Internal Server Error" }, { status: 500 })
    }
}
