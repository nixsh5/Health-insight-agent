"use client"

import { useState } from "react"

type DeviationSummary = {
    metric: string
    today: number
    mean: number
    pctOfBaseline: number
    flag: "low" | "high" | "ok"
}

type RiskItem = {
    id: string
    label: string
    level: "low" | "moderate" | "high"
    reason: string
}

export function HealthAgentCard() {
    const [loading, setLoading] = useState(false)
    const [deviations, setDeviations] = useState<DeviationSummary[]>([])
    const [risks, setRisks] = useState<RiskItem[]>([])
    const [coach, setCoach] = useState("")
    const [ranOnce, setRanOnce] = useState(false)
    const [scenario, setScenario] = useState<"normal" | "low-steps" | "low-sleep" | "stress">("normal")

    async function runAgent(nextScenario?: "normal" | "low-steps" | "low-sleep" | "stress") {
        const chosen = nextScenario ?? scenario
        setScenario(chosen)
        setLoading(true)
        setRanOnce(true)
        try {
            const resp = await fetch(`/api/health-agent/run?scenario=${chosen}`)
            if (resp.ok) {
                const json = await resp.json()
                setDeviations(json.deviations || [])
                setRisks(json.risks || [])
                setCoach(json.coachingText || "")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-2">
            <div className="flex flex-col gap-2">
                <button
                    onClick={() => runAgent()}
                    disabled={loading}
                    className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? "Running..." : ranOnce ? "Re-run Agent" : "Check Health Status"}
                </button>

                <div className="flex flex-wrap gap-1 text-[10px]">
                    <button
                        onClick={() => runAgent("normal")}
                        className={`px-2 py-1 rounded border ${scenario === "normal" ? "bg-primary/10" : ""}`}
                    >
                        Normal
                    </button>
                    <button
                        onClick={() => runAgent("low-steps")}
                        className={`px-2 py-1 rounded border ${scenario === "low-steps" ? "bg-primary/10" : ""}`}
                    >
                        Low steps
                    </button>
                    <button
                        onClick={() => runAgent("low-sleep")}
                        className={`px-2 py-1 rounded border ${scenario === "low-sleep" ? "bg-primary/10" : ""}`}
                    >
                        Low sleep
                    </button>
                    <button
                        onClick={() => runAgent("stress")}
                        className={`px-2 py-1 rounded border ${scenario === "stress" ? "bg-primary/10" : ""}`}
                    >
                        Stress
                    </button>
                </div>
            </div>

            {ranOnce && !loading && (
                <div className="mt-3 space-y-3 rounded-md border bg-sidebar-accent/10 p-3 text-xs text-sidebar-foreground">
                    {deviations.length > 0 && (
                        <div>
                            <p className="mb-1 font-semibold text-foreground/80">Today vs Baseline</p>
                            <div className="space-y-1">
                                {deviations
                                    .filter((d) => d.flag !== "ok")
                                    .map((d) => (
                                        <div key={d.metric} className="flex justify-between">
                                            <span>{d.metric}</span>
                                            <span
                                                className={
                                                    d.flag === "low"
                                                        ? "text-red-500"
                                                        : d.flag === "high"
                                                            ? "text-orange-500"
                                                            : ""
                                                }
                                            >
                        {d.pctOfBaseline.toFixed(0)}% ({d.flag})
                      </span>
                                        </div>
                                    ))}
                                {deviations.every((d) => d.flag === "ok") && (
                                    <div className="text-muted-foreground">All metrics normal</div>
                                )}
                            </div>
                        </div>
                    )}

                    {risks.length > 0 && (
                        <div>
                            <p className="mb-1 mt-2 font-semibold text-foreground/80">Risks</p>
                            <ul className="list-inside list-disc space-y-0.5">
                                {risks.map((r) => (
                                    <li key={r.id}>
                                        <span className="font-medium">{r.label}</span>{" "}
                                        <span className="opacity-70">({r.level})</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {coach && (
                        <div>
                            <p className="mb-1 mt-2 font-semibold text-foreground/80">Coach Insight</p>
                            <p className="line-clamp-4 leading-relaxed opacity-90">{coach}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
