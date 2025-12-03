import { NextResponse } from "next/server"
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
} from "@/lib/synthetic-health"
import { scoreLearnedFatigueRisk } from "@/lib/risk-model"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
    const runs = 500

    let tpRule = 0,
        fpRule = 0,
        fnRule = 0
    let tpModel = 0,
        fpModel = 0,
        fnModel = 0

    for (let i = 0; i < runs; i++) {
        // 1) Generate history
        const history = generateSyntheticHistory(60, 12000 + i)

        // 2) With 30% probability, force a "fatigue day" on the last day
        const forceFatigue = Math.random() < 0.3
        if (forceFatigue) {
            const today = history[history.length - 1]
            today.steps = Math.round(today.steps * 0.5)
            today.sleepHours = Math.max(3, today.sleepHours - 3)
        }

        // 3) Compute deviations after any forcing
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)

        const steps = deviations.find((d) => d.metric === "steps")
        const sleep = deviations.find((d) => d.metric === "sleepHours")
        const hrv = deviations.find((d) => d.metric === "hrv")
        const rhr = deviations.find((d) => d.metric === "restingHr")

        const stepsPct = steps?.pctOfBaseline ?? 100
        const sleepPct = sleep?.pctOfBaseline ?? 100
        const hrvPct = hrv?.pctOfBaseline ?? 100
        const rhrPct = rhr?.pctOfBaseline ?? 100

        // 4) Synthetic ground truth: easier but still meaningful
        // fatigue if both steps and sleep are clearly low, and HRV/RHR weakly support it
        const yTrue =
            stepsPct < 80 &&
            sleepPct < 85 &&
            (hrvPct < 95 || rhrPct > 103)
                ? 1
                : 0

        // 5) Naive rule baseline (more sensitive, less specific)
        const yRule = stepsPct < 80 || sleepPct < 85 ? 1 : 0

        // 6) Learned model
        const learned = scoreLearnedFatigueRisk(deviations)
        const yModel = learned.prob > 0.3 ? 1 : 0

        // Confusion counts – rule
        if (yTrue === 1 && yRule === 1) tpRule++
        else if (yTrue === 0 && yRule === 1) fpRule++
        else if (yTrue === 1 && yRule === 0) fnRule++

        // Confusion counts – model
        if (yTrue === 1 && yModel === 1) tpModel++
        else if (yTrue === 0 && yModel === 1) fpModel++
        else if (yTrue === 1 && yModel === 0) fnModel++
    }

    const recallRule = tpRule / (tpRule + fnRule || 1)
    const recallModel = tpModel / (tpModel + fnModel || 1)
    const precisionRule = tpRule / (tpRule + fpRule || 1)
    const precisionModel = tpModel / (tpModel + fpModel || 1)

    return NextResponse.json({
        runs,
        groundTruth:
            "fatigue = low steps + low sleep (+ supportive HRV/RHR) with ~30% forced fatigue days",
        ruleBaseline: {
            tp: tpRule,
            fp: fpRule,
            fn: fnRule,
            recall: recallRule,
            precision: precisionRule,
        },
        learnedModel: {
            tp: tpModel,
            fp: fpModel,
            fn: fnModel,
            recall: recallModel,
            precision: precisionModel,
        },
    })
}
