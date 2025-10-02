import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = req.cookies.get("auth_token")?.value

    // Block protected routes without a token
    if (!token && pathname.startsWith("/dashboard")) {
        const url = new URL("/", req.url) // login page
        url.searchParams.set("next", pathname) // optional: where to go after login
        return NextResponse.redirect(url)
    }

    // Prevent logged-in users from seeing auth pages
    if (token && (pathname === "/" || pathname === "/signup" || pathname.startsWith("/auth"))) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
}

export const config = {


}
