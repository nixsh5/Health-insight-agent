// src/lib/data-quality-agent.ts
import type { SyntheticDay } from "@/lib/synthetic-health"

export type DataQualityIssue = {
    type: "missing-days" | "out-of-range" | "low-variance"
    severity: "low" | "moderate" | "high"
    message: string
}

export type DataQualityReport = {
    issues: DataQualityIssue[]
    qualityScore: number // 0–1
}

export function assessDataQuality(history: SyntheticDay[]): DataQualityReport {
    const issues: DataQualityIssue[] = []

    if (history.length < 30) {
        issues.push({
            type: "missing-days",
            severity: "high",
            message: `Only ${history.length} days of data present; at least 30 are preferred.`,
        })
    }

    // Simple range checks
    const bad = history.filter((d) => {
        return (
            d.steps < 1000 ||
            d.steps > 50000 ||
            d.restingHr < 40 ||
            d.restingHr > 100 ||
            d.hrv < 20 ||
            d.hrv > 200 ||
            d.sleepHours < 3 ||
            d.sleepHours > 14
        )
    })
    if (bad.length > 0) {
        issues.push({
            type: "out-of-range",
            severity: "moderate",
            message: `${bad.length} days have out-of-range values (steps/HR/HRV/sleep).`,
        })
    }

    // Crude variance check: if steps almost never change, maybe device is stuck
    const steps = history.map((d) => d.steps)
    const mean =
        steps.reduce((s, v) => s + v, 0) / (steps.length || 1)
    const varSum = steps.reduce((s, v) => s + (v - mean) ** 2, 0)
    const std = Math.sqrt(varSum / (steps.length || 1))
    const cv = mean ? std / mean : 0

    if (cv < 0.05) {
        issues.push({
            type: "low-variance",
            severity: "low",
            message: "Steps vary very little across days; device or data may be static.",
        })
    }

    // Quality score: start at 1 and penalize issues
    let qualityScore = 1
    for (const issue of issues) {
        if (issue.severity === "high") qualityScore -= 0.4
        else if (issue.severity === "moderate") qualityScore -= 0.2
        else qualityScore -= 0.1
    }
    qualityScore = Math.max(0, Math.min(1, qualityScore))

    return { issues, qualityScore }
}
