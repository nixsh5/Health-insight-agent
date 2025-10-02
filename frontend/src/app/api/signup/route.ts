import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Create user in your backend
        const resp = await fetch("https://project-0tv2.onrender.com/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        })

        const result = await resp.json()
        if (!resp.ok) {
            return NextResponse.json({ message: result.message || "Signup failed" }, { status: resp.status })
        }

        // If your backend returns a token on signup, set it here.
        // If it does NOT return a token, you can immediately log in with the provided credentials to get one.
        let token = result?.token as string | undefined

        if (!token) {
            // Attempt auto-login using the same credentials to obtain a token
            const loginResp = await fetch("https://project-0tv2.onrender.com/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: body.email, password: body.password }),
                cache: "no-store",
            })
            const loginJson = await loginResp.json()
            if (!loginResp.ok) {
                // Fallback: signup succeeded but auto-login failed
                return NextResponse.json({ signedUp: true, needsLogin: true }, { status: 200 })
            }
            token = loginJson.token as string
        }

        const res = NextResponse.json({ ok: true })
        res.cookies.set("auth_token", token!, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })
        return res
    } catch {
        return NextResponse.json({ message: "Unexpected error" }, { status: 500 })
    }
}
