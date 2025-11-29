import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // 1) Create user in your backend
        const resp = await fetch("https://project-0tv2.onrender.com/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
        })

        const result = await resp.json().catch(() => ({}))

        if (!resp.ok) {
            const msg =
                typeof result === "object" &&
                result !== null &&
                "message" in result &&
                typeof (result as { message?: string }).message === "string"
                    ? (result as { message?: string }).message!
                    : "Signup failed"

            return NextResponse.json({ message: msg }, { status: resp.status })
        }

        // 2) Get token – either from signup response or via auto-login
        let token = (result as { token?: string }).token

        if (!token) {
            const loginResp = await fetch("https://project-0tv2.onrender.com/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: body.email, password: body.password }),
                cache: "no-store",
            })

            const loginJson = await loginResp.json().catch(() => ({}))

            if (!loginResp.ok || typeof (loginJson as { token?: string }).token !== "string") {
                // signup ok but auto-login failed -> frontend should send user to /login
                return NextResponse.json({ signedUp: true, needsLogin: true }, { status: 200 })
            }

            token = (loginJson as { token: string }).token
        }

        // 3) Set auth cookie and return ok
        const res = NextResponse.json({ ok: true })

        res.cookies.set("auth_token", token, {
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
