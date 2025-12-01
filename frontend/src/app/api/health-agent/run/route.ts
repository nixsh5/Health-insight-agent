import { NextResponse } from "next/server"
import {
    generateSyntheticHistory,
    computeBaselines,
    computeDeviations,
} from "@/lib/synthetic-health"
import { deriveRisks } from "@/lib/risk-agent"
import { runFederatedRound } from "@/lib/federated-stub"
// If you want to add uncertainty scores, also import conformal-agent:
// import { calculateConformalScores } from "@/lib/conformal-agent"

const LOCAL_OPENAI_BASE = process.env.LOCAL_OPENAI_BASE || "http://localhost:11434/v1"
const LOCAL_MODEL = process.env.LOCAL_MODEL || "deepseek-r1:latest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
    try {
        // 1. User's synthetic personalized stats
        const history = generateSyntheticHistory(60, 123)
        const baselines = computeBaselines(history)
        const deviations = computeDeviations(history, baselines)
        const risks = deriveRisks(deviations)

        // 2. Federated round with other "synthetic users"
        const federatedState = runFederatedRound(10) // Simulate 10 clients
        const globalModel = federatedState.globalModel

        // 3. Federated context for prompt
        const stepsPersonal = baselines.find(b => b.metric === "steps")?.mean || 0
        const stepsGlobal = globalModel.find(b => b.metric === "steps")?.mean || 0

        const fedNote = `\n\nFEDERATED CONTEXT: User's baseline steps (${Math.round(stepsPersonal)}) compared to Global Federated Average (${Math.round(stepsGlobal)}). User is ${stepsPersonal > stepsGlobal ? "above" : "below"} average peer activity.`

        // (OPTIONAL) If uncertainty/conformal agent added:
        // const confidence = calculateConformalScores(deviations);
        // const lowConfidenceMetrics = confidence.filter(c => c.confidence < 0.6).map(c => c.metric).join(", ")
        // const calibrationNote = lowConfidenceMetrics
        //   ? `\n\nUNCERTAINTY WARNING: Data for [${lowConfidenceMetrics}] is highly variable. Express lower confidence in these insights.`
        //   : `\n\nCONFIDENCE: Data quality is high and stable.`

        // 4. Prompt for coach model includes federated comparison
        const today = history[history.length - 1]
        const prompt =
            `You are a health coach.\n` +
            `User has 60 days of synthetic wearable data (steps, sleep, HRV, resting HR).\n` +
            `Today: steps=${today.steps}, sleep=${today.sleepHours}h, HRV=${today.hrv}, resting HR=${today.restingHr}.\n` +
            `Baselines and deviations:\n` +
            JSON.stringify(deviations, null, 2) +
            `\n\nDerived risks:\n` +
            JSON.stringify(risks, null, 2) +
            fedNote +
            // (OPTIONAL) + calibrationNote
            `\n\nExplain in simple language:\n` +
            `1) What looks normal vs different today.\n` +
            `2) The 1–2 most important risks (if any).\n` +
            `3) 3 concrete but safe lifestyle tips for the next 24 hours.\n`

        let coachingText = ""

        try {
            const resp = await fetch(`${LOCAL_OPENAI_BASE}/chat/completions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: LOCAL_MODEL,
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 300,
                    temperature: 0.7,
                }),
            })

            if (resp.ok) {
                const data = (await resp.json()) as {
                    choices?: Array<{ message?: { content?: string } }>
                }
                coachingText = data?.choices?.[0]?.message?.content ?? ""
            } else {
                console.error("Local coach model error", resp.status)
            }
        } catch (e) {
            console.error("Local model call failed", e)
        }

        // 5. Return everything for frontend display
        return NextResponse.json({
            history,
            baselines,
            deviations,
            risks,
            coachingText,
            federated: {
                globalModel,
                participatingClients: federatedState.clientsParticipated
            }
            // (OPTIONAL) , confidence
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
