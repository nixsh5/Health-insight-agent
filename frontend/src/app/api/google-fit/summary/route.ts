import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

function nowNs() {
    return Date.now() * 1_000_000
}

export async function GET(_req: NextRequest) {
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET
        const refreshToken = process.env.GOOGLE_FIT_REFRESH_TOKEN

        if (!clientId || !clientSecret) {
            return NextResponse.json(
                { message: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" },
                { status: 500 },
            )
        }

        if (!refreshToken) {
            return NextResponse.json(
                { message: "Missing GOOGLE_FIT_REFRESH_TOKEN" },
                { status: 500 },
            )
        }

        // 1) Exchange refresh_token for access_token
        const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        })

        if (!tokenResp.ok) {
            const t = await tokenResp.text().catch(() => "")
            console.error("Refresh token failed", tokenResp.status, t)
            return NextResponse.json(
                { message: "Failed to refresh access token" },
                { status: 502 },
            )
        }

        const tokenJson = (await tokenResp.json()) as { access_token: string }
        const accessToken = tokenJson.access_token

        // 2) Call Google Fit aggregate endpoint for last 7 days
        const endNs = nowNs()
        const startNs = endNs - 7 * 24 * 60 * 60 * 1_000_000_000 // 7 days

        const startTimeMillis = Math.floor(startNs / 1_000_000)
        const endTimeMillis = Math.floor(endNs / 1_000_000)

        const aggResp = await fetch(
            "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    aggregateBy: [
                        { dataTypeName: "com.google.step_count.delta" },
                        { dataTypeName: "com.google.heart_rate.bpm" },
                        { dataTypeName: "com.google.calories.expended" },
                        { dataTypeName: "com.google.active_minutes" },
                    ],
                    bucketByTime: { durationMillis: 24 * 60 * 60 * 1000 },
                    startTimeMillis,
                    endTimeMillis,
                }),
            },
        )

        if (!aggResp.ok) {
            const t = await aggResp.text().catch(() => "")
            console.error("Fit aggregate error", aggResp.status, t)
            return NextResponse.json(
                { message: "Failed to fetch Google Fit data" },
                { status: 502 },
            )
        }

        const aggJson = await aggResp.json()

        const buckets: any[] = aggJson.bucket || []
        const days: Array<{
            date: string
            steps: number
            avgHr?: number
            calories?: number
            activeMinutes?: number
        }> = []

        for (const b of buckets) {
            const startMs = Number(b.startTimeMillis)
            const date = new Date(startMs).toISOString().slice(0, 10)

            let steps = 0
            let hrSum = 0
            let hrCount = 0
            let calories = 0
            let activeMinutes = 0

            for (const ds of b.dataset ?? []) {
                const dataSourceId = ds.dataSourceId || ""
                for (const p of ds.point ?? []) {
                    const values = p.value || []

                    if (dataSourceId.includes("com.google.step_count.delta")) {
                        if (values[0]?.intVal != null) steps += values[0].intVal
                    } else if (dataSourceId.includes("com.google.heart_rate.bpm")) {
                        if (values[0]?.fpVal != null) {
                            hrSum += values[0].fpVal
                            hrCount += 1
                        }
                    } else if (dataSourceId.includes("com.google.calories.expended")) {
                        if (values[0]?.fpVal != null) calories += values[0].fpVal
                    } else if (dataSourceId.includes("com.google.active_minutes")) {
                        if (values[0]?.intVal != null) activeMinutes += values[0].intVal
                    }
                }
            }

            days.push({
                date,
                steps,
                avgHr: hrCount ? hrSum / hrCount : undefined,
                calories: calories || undefined,
                activeMinutes: activeMinutes || undefined,
            })
        }

        const totalSteps = days.reduce((s, d) => s + d.steps, 0)
        const avgSteps = days.length ? Math.round(totalSteps / days.length) : 0
        const summaryText =
            `Last ${days.length} days: average ${avgSteps} steps/day. ` +
            `Full daily stats (steps, heart rate, calories, active minutes) are in the 'days' array.`

        return NextResponse.json({
            startTimeMillis,
            endTimeMillis,
            buckets,
            days,
            summaryText,
        })
    } catch (e) {
        const err = e as Error
        console.error(err)
        return NextResponse.json(
            { message: err.message || "Internal error" },
            { status: 500 },
        )
    }
}
