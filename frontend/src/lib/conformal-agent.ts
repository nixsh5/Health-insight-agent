// src/lib/conformal-agent.ts
import type { DeviationSummary } from "@/lib/synthetic-health"

export type ConformalScore = {
    metric: string
    confidence: number // 0–1
    interval: [number, number]
}

export function calculateConformalScores(
    deviations: DeviationSummary[],
): ConformalScore[] {
    return deviations.map((d) => {
        const cv = d.mean ? d.std / d.mean : 0
        let confidence = Math.max(0.1, 1 - cv * 1.5)
        confidence = parseFloat(confidence.toFixed(2))

        const lower = d.mean - 1.65 * d.std
        const upper = d.mean + 1.65 * d.std

        return {
            metric: d.metric,
            confidence,
            interval: [
                parseFloat(lower.toFixed(1)),
                parseFloat(upper.toFixed(1)),
            ],
        }
    })
}
