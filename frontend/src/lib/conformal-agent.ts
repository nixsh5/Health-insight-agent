// src/lib/conformal-agent.ts
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
    type DeviationSummary,
} from "@/lib/synthetic-health"

export type ConformalScore = {
    metric: string
    confidence: number // 0–1
    interval: [number, number]
}

// Build a calibration set of absolute residuals |today - mean|
// across multiple synthetic users
function buildCalibrationSet(numUsers = 50): Record<string, number[]> {
    const residualsByMetric: Record<string, number[]> = {}

    for (let u = 0; u < numUsers; u++) {
        const history = generateSyntheticHistory(60, 1000 + u)
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)

        for (const d of deviations) {
            const absResidual = Math.abs(d.today - d.mean)
            if (!residualsByMetric[d.metric]) {
                residualsByMetric[d.metric] = []
            }
            residualsByMetric[d.metric].push(absResidual)
        }
    }

    return residualsByMetric
}

// Empirical (1 - alpha) quantile
function empiricalQuantile(values: number[], q: number): number {
    if (!values.length) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))
    return sorted[idx]
}

// Cached calibration so it runs once
let cachedResiduals: Record<string, number[]> | null = null
let cachedQuantiles: Record<string, number> | null = null

function ensureCalibration(alpha = 0.1) {
    if (cachedResiduals && cachedQuantiles) return

    cachedResiduals = buildCalibrationSet(50)
    cachedQuantiles = {}

    for (const metric of Object.keys(cachedResiduals)) {
        const q = empiricalQuantile(cachedResiduals[metric], 1 - alpha)
        cachedQuantiles[metric] = q
    }
}

// Main conformal scoring function
export function calculateConformalScores(
    deviations: DeviationSummary[],
    alpha = 0.1,
): ConformalScore[] {
    ensureCalibration(alpha)
    const quantiles = cachedQuantiles || {}
    const baseConfidence = 1 - alpha

    return deviations.map((d) => {
        const q = quantiles[d.metric] ?? 0
        const lower = d.mean - q
        const upper = d.mean + q

        const inBand = d.today >= lower && d.today <= upper
        const confidence = parseFloat((inBand ? baseConfidence : baseConfidence * 0.5).toFixed(2))

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
