// src/lib/federated-stub.ts
import {
    generateSyntheticHistory,
    computeBaselines,
    type BaselineStats,
} from "@/lib/synthetic-health"

type ClientModel = BaselineStats[]

export type FederatedRoundResult = {
    round: number
    globalModel: BaselineStats[]
}

export function runFederatedRound(numClients = 5): {
    roundId: number
    clientsParticipated: number
    globalModel: BaselineStats[]
} {
    const { globalModel } = runFederatedTraining({
        numClients,
        numRounds: 1,
    }).rounds[0]

    return {
        roundId: Date.now(),
        clientsParticipated: numClients,
        globalModel,
    }
}

// New: multi‑round FedAvg simulation
export function runFederatedTraining(options?: {
    numClients?: number
    numRounds?: number
}) {
    const numClients = options?.numClients ?? 10
    const numRounds = options?.numRounds ?? 5

    // fixed synthetic clients
    const clientHistories = Array.from({ length: numClients }, (_, i) =>
        generateSyntheticHistory(60, 5000 + i),
    )

    // initialize client models with local baselines
    let clientModels: ClientModel[] = clientHistories.map((h) =>
        computeBaselines(h),
    )

    const rounds: FederatedRoundResult[] = []

    for (let r = 0; r < numRounds; r++) {
        // FedAvg aggregation on server
        const globalModel = aggregateBaselines(clientModels)

        rounds.push({ round: r + 1, globalModel })

        // send global model back to clients (here we just nudge them toward global)
        clientModels = clientModels.map((local) =>
            personalizeTowardsGlobal(local, globalModel, 0.5),
        )
    }

    return { numClients, numRounds, rounds }
}

// Average means/stds across clients per metric
function aggregateBaselines(clientModels: ClientModel[]): BaselineStats[] {
    const metrics = ["steps", "restingHr", "hrv", "sleepHours"]
    const global: BaselineStats[] = []

    for (const metric of metrics) {
        let sumMean = 0
        let sumStd = 0
        let count = 0

        for (const cm of clientModels) {
            const stat = cm.find((s) => s.metric === metric)
            if (stat) {
                sumMean += stat.mean
                sumStd += stat.std
                count++
            }
        }

        if (count > 0) {
            global.push({
                metric,
                mean: sumMean / count,
                std: sumStd / count,
            })
        }
    }
    return global
}

// Simple personalization: move local baselines part‑way toward global
function personalizeTowardsGlobal(
    local: ClientModel,
    global: BaselineStats[],
    lambda: number,
): ClientModel {
    return local.map((l) => {
        const g = global.find((g) => g.metric === l.metric)
        if (!g) return l
        return {
            metric: l.metric,
            mean: l.mean + lambda * (g.mean - l.mean),
            std: l.std + lambda * (g.std - l.std),
        }
    })
}
