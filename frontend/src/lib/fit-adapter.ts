// src/lib/fit-adapter.ts
import type { SyntheticDay } from "@/lib/synthetic-health"

type FitDay = {
    date: string
    steps?: number
    restingHr?: number
    hrv?: number
    sleepHours?: number
}

export function historyFromFit(days: FitDay[]): SyntheticDay[] {
    return days
        .map((d) => ({
            date: d.date,
            steps: d.steps ?? 0,
            restingHr: d.restingHr ?? 0,
            hrv: d.hrv ?? 0,
            sleepHours: d.sleepHours ?? 0,
        }))
        .filter((d) => d.steps > 0)
}
