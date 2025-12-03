import { NextResponse } from "next/server"
import { generateSyntheticHistory, computeBaselines, computeDeviations } from "@/lib/synthetic-health"
import { deriveRisks } from "@/lib/risk-agent"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SCENARIOS = ["normal", "low-steps", "low-sleep", "stress"] as const
type Scenario = (typeof SCENARIOS)[number]

function applyScenario(history: any[], scenario: Scenario) {
    const today = history[history.length - 1]
    if (scenario === "low-steps") {
        today.steps = Math.round(today.steps * 0.4)
    } else if (scenario === "low-sleep") {
        today.sleepHours = Math.max(3, today.sleepHours - 3)
    } else if (scenario === "stress") {
        today.restingHr += 8
        today.hrv = Math.max(20, today.hrv - 15)
    }
}

export async function GET() {
    const runsPerScenario = 20
    const stats: Record<Scenario, Record<string, number>> = {
        normal: {},
        "low-steps": {},
        "low-sleep": {},
        stress: {},
    }

    for (const scenario of SCENARIOS) {
        for (let i = 0; i < runsPerScenario; i++) {
            let history = generateSyntheticHistory(60, 1000 * i + SCENARIOS.indexOf(scenario))
            applyScenario(history, scenario)
            const baselines = computeBaselines(history)
            const deviations = computeDeviations(history, baselines)
            const risks = deriveRisks(deviations)

            for (const r of risks) {
                stats[scenario][r.id] = (stats[scenario][r.id] || 0) + 1
            }
        }
    }

    return NextResponse.json({ runsPerScenario, stats })
}
