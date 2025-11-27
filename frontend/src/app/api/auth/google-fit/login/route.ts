import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = process.env.GOOGLE_FIT_REDIRECT_URI
    const scopes = process.env.GOOGLE_FIT_SCOPES

    if (!clientId || !redirectUri || !scopes) {
        return NextResponse.json(
            { message: "Missing Google Fit env vars" },
            { status: 500 },
        )
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        access_type: "offline", // so we get a refresh_token
        prompt: "consent",      // always ask once, then you can remove later
        scope: scopes,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(authUrl)
}
