// src/lib/federated-stub.ts
import {
    generateSyntheticHistory,
    computeBaselines,
    type BaselineStats,
} from "@/lib/synthetic-health"

export function runFederatedRound(numClients = 5) {
    const clientUpdates: BaselineStats[][] = []

    for (let i = 0; i < numClients; i++) {
        const privateHistory = generateSyntheticHistory(60, i * 100)
        const privateModel = computeBaselines(privateHistory)
        clientUpdates.push(privateModel)
    }

    const globalModel: BaselineStats[] = []
    const metrics = ["steps", "restingHr", "hrv", "sleepHours"]

    metrics.forEach((metric) => {
        let sumMean = 0
        let sumStd = 0

        clientUpdates.forEach((clientModel) => {
            const stat = clientModel.find((m) => m.metric === metric)
            if (stat) {
                sumMean += stat.mean
                sumStd += stat.std
            }
        })

        globalModel.push({
            metric,
            mean: sumMean / numClients,
            std: sumStd / numClients,
        })
    })

    return {
        roundId: Date.now(),
        clientsParticipated: numClients,
        globalModel,
    }
}
