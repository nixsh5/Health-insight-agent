import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")
    const error = url.searchParams.get("error")

    if (error) {
        return NextResponse.json({ message: `Google error: ${error}` }, { status: 400 })
    }
    if (!code) {
        return NextResponse.json({ message: "Missing code" }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json(
            { message: "Missing Google OAuth env vars" },
            { status: 500 },
        )
    }

    // Exchange code for tokens
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    })

    if (!tokenResp.ok) {
        const t = await tokenResp.text()
        console.error("Google token exchange failed", tokenResp.status, t)
        return NextResponse.json(
            { message: "Failed to exchange code for tokens" },
            { status: 502 },
        )
    }

    const tokens = await tokenResp.json() as {
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: string
        scope: string
    }

    console.log("Google Fit tokens:", tokens)

    // TODO later: store refresh_token in DB linked to current user.
    // TODO For now, just show success on screen.
    return NextResponse.json({
        message: "Google Fit connected (tokens printed in server logs)",
        hasRefreshToken: !!tokens.refresh_token,
    })
}
