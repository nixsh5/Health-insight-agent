import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    console.log("Route was called")
    try {
        const { query, text } = await req.json().catch(() => ({} as any))

        if (!query || typeof query !== "string") {
            return NextResponse.json({ message: "Missing query" }, { status: 400 })
        }

        const hfToken = process.env.HUGGINGFACE_API_TOKEN
        if (!hfToken) {
            return NextResponse.json({ message: "Missing HUGGINGFACE_API_TOKEN" }, { status: 500 })
        }

        // Build the user message from query and optional PDF text
        const userMessage = text
            ? `Document content:\n${text}\n\nQuestion: ${query}`
            : query

        // Call the HF Router's OpenAI-compatible chat completions endpoint
        const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemma-2-2b-it:nebius",
                messages: [
                    {
                        role: "user",
                        content: userMessage,
                    },
                ],
                max_tokens: 256,
                temperature: 0.7,
            }),
        })

        if (!resp.ok) {
            const t = await resp.text()
            console.error("HF Router chat completions failed", { status: resp.status, body: t })
            return NextResponse.json({ message: "AI API error: " + t }, { status: 502 })
        }

        const data = await resp.json()
        // Extract the assistant's reply from the OpenAI-style response
        const answer = data.choices?.[0]?.message?.content || JSON.stringify(data)
        return NextResponse.json({ generated_text: answer })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ message: err?.message || "Internal Server Error" }, { status: 500 })
    }
}
