import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        // Call your backend auth endpoint
        const resp = await fetch("https://project-0tv2.onrender.com/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        })
        const result = await resp.json()
        if (!resp.ok) {
            return NextResponse.json({ message: result.message || "Login failed" }, { status: resp.status })
        }

        const token = result.token as string
        const res = NextResponse.json({ ok: true })
        res.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        return res
    } catch (e) {
        return NextResponse.json({ message: "Unexpected error" }, { status: 500 })
    }
}
