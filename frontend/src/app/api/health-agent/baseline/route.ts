import { NextResponse } from "next/server"
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
} from "@/lib/synthetic-health"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
    try {
        // single synthetic user for now; seed makes it deterministic
        const history = generateSyntheticHistory(60, 123)
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)

        return NextResponse.json({
            history,
            baselines,
            deviations,
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
