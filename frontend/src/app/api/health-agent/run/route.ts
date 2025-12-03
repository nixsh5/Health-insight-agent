import { NextResponse } from "next/server"
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
} from "@/lib/synthetic-health"
import { deriveRisks } from "@/lib/risk-agent"
import { runFederatedRound } from "@/lib/federated-stub"
import { assessDataQuality } from "@/lib/data-quality-agent"
import { calculateConformalScores } from "@/lib/conformal-agent"

const LOCAL_OPENAI_BASE =
    process.env.LOCAL_OPENAI_BASE || "http://localhost:11434/v1"
const LOCAL_MODEL =
    process.env.LOCAL_MODEL || "deepseek-r1:latest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const scenario = searchParams.get("scenario") ?? "normal"

        // 1) Generate synthetic N-of-1 history
        const history = generateSyntheticHistory(60, 123)

        // Apply scenario to today's values
        const today = history[history.length - 1]
        if (scenario === "low-steps") {
            today.steps = Math.round(today.steps * 0.4)
        } else if (scenario === "low-sleep") {
            today.sleepHours = Math.max(3, today.sleepHours - 3)
        } else if (scenario === "stress") {
            today.restingHr += 8
            today.hrv = Math.max(20, today.hrv - 15)
        }

        // 2) DataQualityAgent
        const dataQuality = assessDataQuality(history)

        // 3) DeviationAgent
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)

        // 4) RiskAgent
        const risks = deriveRisks(deviations)

        // 5) ConformalAgent (uncertainty)
        const confidence = calculateConformalScores(deviations)

        // 6) Federated stub
        const federatedState = runFederatedRound(10)
        const globalModel = federatedState.globalModel

        const stepsPersonal =
            baselines.find((b) => b.metric === "steps")?.mean || 0
        const stepsGlobal =
            globalModel.find((b) => b.metric === "steps")?.mean || 0

        const fedNote =
            `\n\nFEDERATED CONTEXT: User's baseline steps (${Math.round(
                stepsPersonal,
            )}) vs Global Federated Average (${Math.round(
                stepsGlobal,
            )}). User is ${
                stepsPersonal > stepsGlobal ? "above" : "below"
            } peer activity.`

        const lowConfMetrics = confidence
            .filter((c) => c.confidence < 0.6)
            .map((c) => c.metric)
        const calibrationNote =
            lowConfMetrics.length > 0
                ? `\n\nUNCERTAINTY: Metrics with noisy history [${lowConfMetrics.join(
                    ", ",
                )}] have lower confidence; consider these insights softer.`
                : `\n\nCONFIDENCE: Historical data is stable; insights are high confidence.`

        const qualityNote =
            dataQuality.qualityScore < 0.7
                ? `\n\nDATA QUALITY WARNING: ${dataQuality.issues
                    .map((i) => i.message)
                    .join(" ")}`
                : ""

        // 7) CoachAgent (LLM)
        const prompt =
            `You are a health coach.\n` +
            `Scenario: ${scenario}.\n` +
            `Data-quality score: ${dataQuality.qualityScore.toFixed(2)}.\n` +
            `User has 60 days of synthetic wearable data (steps, sleep, HRV, resting HR).\n` +
            `Today: steps=${today.steps}, sleep=${today.sleepHours}h, HRV=${today.hrv}, resting HR=${today.restingHr}.\n` +
            `Baselines and deviations:\n` +
            JSON.stringify(deviations, null, 2) +
            `\n\nDerived risks:\n` +
            JSON.stringify(risks, null, 2) +
            `\n\nConformal confidence scores:\n` +
            JSON.stringify(confidence, null, 2) +
            fedNote +
            calibrationNote +
            qualityNote +
            `\n\nExplain in simple language:\n` +
            `1) What looks normal vs different today.\n` +
            `2) The 1–2 most important risks (if any) and how confident you are.\n` +
            `3) 3 concrete but safe lifestyle tips for the next 24 hours.\n` +
            `If confidence or data quality is low, say that clearly and be conservative.`

        let coachingText = ""
        try {
            const resp = await fetch(
                `${LOCAL_OPENAI_BASE}/chat/completions`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: LOCAL_MODEL,
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 300,
                        temperature: 0.7,
                    }),
                },
            )

            if (resp.ok) {
                const data = (await resp.json()) as {
                    choices?: Array<{ message?: { content?: string } }>
                }
                coachingText =
                    data?.choices?.[0]?.message?.content ?? ""
            } else {
                console.error("Local coach model error", resp.status)
            }
        } catch (e) {
            console.error("Local model call failed", e)
        }

        return NextResponse.json({
            scenario,
            history,
            dataQuality,
            baselines,
            deviations,
            risks,
            confidence,
            coachingText,
            federated: {
                globalModel,
                participatingClients: federatedState.clientsParticipated,
            },
        })
    } catch (e) {
        const err = e as Error
        console.error(err)
        return NextResponse.json(
            { message: err.message || "Internal error" },
            { status: 500 },
        )
    }
}
