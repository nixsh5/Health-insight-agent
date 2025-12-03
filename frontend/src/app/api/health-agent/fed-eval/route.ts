// src/app/api/health-agent/fed-eval/route.ts
import { NextResponse } from "next/server"
import { runFederatedTraining } from "@/lib/federated-stub"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const result = runFederatedTraining({
            numClients: 20,
            numRounds: 8,
        })

        // for convenience, extract per-round global step mean
        const perRoundStepMean = result.rounds.map((r) => {
            const steps = r.globalModel.find((m) => m.metric === "steps")
            return {
                round: r.round,
                meanSteps: steps ? steps.mean : 0,
            }
        })

        return NextResponse.json({
            numClients: result.numClients,
            numRounds: result.numRounds,
            perRoundStepMean,
            rounds: result.rounds,
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
