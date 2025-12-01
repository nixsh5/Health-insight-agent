import type { DeviationSummary } from "@/lib/synthetic-health"

export type RiskItem = {
    id: string
    label: string
    level: "low" | "moderate" | "high"
    reason: string
}

export function deriveRisks(deviations: DeviationSummary[]): RiskItem[] {
    const risks: RiskItem[] = []

    const steps = deviations.find((d) => d.metric === "steps")
    const hrv = deviations.find((d) => d.metric === "hrv")
    const sleep = deviations.find((d) => d.metric === "sleepHours")
    const restingHr = deviations.find((d) => d.metric === "restingHr")

    if (steps && steps.flag === "low") {
        risks.push({
            id: "low_activity",
            label: "Low activity today",
            level: steps.pctOfBaseline < 50 ? "high" : "moderate",
            reason: `Steps are ${steps.pctOfBaseline.toFixed(0)}% of your usual (${Math.round(
                steps.today,
            )} vs ~${Math.round(steps.mean)}).`,
        })
    }

    if (sleep && sleep.flag === "low") {
        risks.push({
            id: "sleep_deficit",
            label: "Possible sleep deficit",
            level: sleep.pctOfBaseline < 70 ? "moderate" : "low",
            reason: `Sleep is ${sleep.pctOfBaseline.toFixed(0)}% of your baseline (${sleep.today.toFixed(
                1,
            )}h vs ~${sleep.mean.toFixed(1)}h).`,
        })
    }

    if (hrv && restingHr) {
        const hrvLow = hrv.flag === "low"
        const hrHigh = restingHr.flag === "high"
        if (hrvLow && hrHigh) {
            risks.push({
                id: "recovery_stress",
                label: "Recovery / stress load",
                level: "high",
                reason: `HRV is lower than usual (${hrv.pctOfBaseline.toFixed(
                    0,
                )}% of baseline) and resting HR is elevated (${restingHr.pctOfBaseline.toFixed(
                    0,
                )}% of baseline).`,
            })
        }
    }

    if (risks.length === 0) {
        risks.push({
            id: "all_good",
            label: "No major deviations detected",
            level: "low",
            reason: "Today’s activity, sleep, HRV, and resting HR are close to your usual patterns.",
        })
    }

    return risks
}
