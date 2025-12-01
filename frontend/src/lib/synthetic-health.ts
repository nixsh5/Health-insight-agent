// src/lib/synthetic-health.ts

export type SyntheticDay = {
    date: string
    steps: number
    restingHr: number
    hrv: number
    sleepHours: number
}

export type BaselineStats = {
    metric: string
    mean: number
    std: number
}

export type DeviationSummary = {
    metric: string
    today: number
    mean: number
    std: number
    zScore: number
    pctOfBaseline: number
    flag: "low" | "high" | "ok"
}

// simple deterministic RNG for reproducible fake data
function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export function generateSyntheticHistory(days = 60, seed = 42): SyntheticDay[] {
    const rand = mulberry32(seed)
    const out: SyntheticDay[] = []

    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const date = d.toISOString().slice(0, 10)

        // base patterns
        const stepsBase = 9000 + rand() * 2000 // 9k–11k
        const hrBase = 62 + rand() * 6 // 62–68
        const hrvBase = 70 + rand() * 15 // 70–85 ms
        const sleepBase = 6.5 + rand() * 2 // 6.5–8.5h

        // small noise day‑to‑day
        const steps = Math.round(stepsBase + (rand() - 0.5) * 1500)
        const restingHr = Math.round(hrBase + (rand() - 0.5) * 4)
        const hrv = Math.round(hrvBase + (rand() - 0.5) * 10)
        const sleepHours = parseFloat((sleepBase + (rand() - 0.5) * 1).toFixed(1))

        out.push({ date, steps, restingHr, hrv, sleepHours })
    }

    return out
}

function meanStd(values: number[]): { mean: number; std: number } {
    if (!values.length) return { mean: 0, std: 0 }
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const varSum = values.reduce((s, v) => s + (v - mean) ** 2, 0)
    const std = Math.sqrt(varSum / values.length)
    return { mean, std }
}

export function computeBaselines(history: SyntheticDay[]): BaselineStats[] {
    const hist = history.slice(0, -1) // exclude today for baseline
    if (!hist.length) return []

    const stepsArr = hist.map((d) => d.steps)
    const hrArr = hist.map((d) => d.restingHr)
    const hrvArr = hist.map((d) => d.hrv)
    const sleepArr = hist.map((d) => d.sleepHours)

    const res: BaselineStats[] = []

    const { mean: mSteps, std: sSteps } = meanStd(stepsArr)
    res.push({ metric: "steps", mean: mSteps, std: sSteps })

    const { mean: mHr, std: sHr } = meanStd(hrArr)
    res.push({ metric: "restingHr", mean: mHr, std: sHr })

    const { mean: mHrv, std: sHrv } = meanStd(hrvArr)
    res.push({ metric: "hrv", mean: mHrv, std: sHrv })

    const { mean: mSleep, std: sSleep } = meanStd(sleepArr)
    res.push({ metric: "sleepHours", mean: mSleep, std: sSleep })

    return res
}

export function computeDeviations(
    history: SyntheticDay[],
    baselines: BaselineStats[],
): DeviationSummary[] {
    const today = history[history.length - 1]
    if (!today) return []

    return baselines.map((b) => {
        const todayVal = today[b.metric as keyof SyntheticDay] as number
        const zScore = b.std ? (todayVal - b.mean) / b.std : 0
        const pctOfBaseline = b.mean ? (todayVal / b.mean) * 100 : 0

        let flag: "low" | "high" | "ok" = "ok"
        if (b.metric === "steps" || b.metric === "sleepHours" || b.metric === "hrv") {
            if (pctOfBaseline < 70) flag = "low"
            else if (pctOfBaseline > 130) flag = "high"
        } else if (b.metric === "restingHr") {
            if (pctOfBaseline > 130) flag = "high"
            else if (pctOfBaseline < 70) flag = "low"
        }

        return {
            metric: b.metric,
            today: todayVal,
            mean: b.mean,
            std: b.std,
            zScore,
            pctOfBaseline,
            flag,
        }
    })
}
