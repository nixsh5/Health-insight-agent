// src/lib/risk-model.ts
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
    type DeviationSummary,
} from "@/lib/synthetic-health"

export type LearnedRiskOutput = {
    id: string
    label: string
    prob: number
}

// Hand‑crafted logistic regression weights for a synthetic "fatigue risk"
const WEIGHTS = {
    bias: -3.0,
    stepsPct: 0.05,   // higher (100 - stepsPct) => stronger effect
    sleepPct: 0.06,
    hrvPct: 0.03,
    rhrPct: 0.04,
}

function sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x))
}

// Convert deviations to features in percent-of-baseline space
function featuresFromDeviations(devs: DeviationSummary[]) {
    const byMetric: Record<string, DeviationSummary> = {}
    devs.forEach((d) => {
        byMetric[d.metric] = d
    })

    const stepsPct = byMetric["steps"]?.pctOfBaseline ?? 100
    const sleepPct = byMetric["sleepHours"]?.pctOfBaseline ?? 100
    const hrvPct = byMetric["hrv"]?.pctOfBaseline ?? 100
    const rhrPct = byMetric["restingHr"]?.pctOfBaseline ?? 100

    return { stepsPct, sleepPct, hrvPct, rhrPct }
}

// Learned risk score using the fixed weights above
export function scoreLearnedFatigueRisk(
    deviations: DeviationSummary[],
): LearnedRiskOutput {
    const { stepsPct, sleepPct, hrvPct, rhrPct } = featuresFromDeviations(
        deviations,
    )

    const z =
        WEIGHTS.bias +
        WEIGHTS.stepsPct * (100 - stepsPct) +
        WEIGHTS.sleepPct * (100 - sleepPct) +
        WEIGHTS.hrvPct * (100 - hrvPct) +
        WEIGHTS.rhrPct * (rhrPct - 100)

    const prob = sigmoid(z)

    return {
        id: "learned_fatigue",
        label: "Learned fatigue / low-recovery risk",
        prob,
    }
}

// Optional: synthetic training stub to justify weights in the paper
export function trainSyntheticRiskModel(numSamples = 1000) {
    // Not doing real optimization here to keep it simple;
    // you can later extend this to actually fit WEIGHTS using gradient descent.
    const samples: { x: number[]; y: number }[] = []

    for (let i = 0; i < numSamples; i++) {
        const history = generateSyntheticHistory(60, 9000 + i)
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)

        const { stepsPct, sleepPct, hrvPct, rhrPct } = featuresFromDeviations(
            deviations,
        )

        // Synthetic label: fatigue if all three are low
        const label =
            stepsPct < 70 && sleepPct < 80 && hrvPct < 90 && rhrPct > 105 ? 1 : 0

        samples.push({
            x: [stepsPct, sleepPct, hrvPct, rhrPct],
            y: label,
        })
    }

    return { samples, usedWeights: WEIGHTS }
}
