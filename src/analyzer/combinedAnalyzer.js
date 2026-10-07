function combineProperty(staticValue, dynamicValue) {
    if (staticValue === dynamicValue) {
        return staticValue;
    }

    return "UNCERTAIN";
}

function combineResults(staticResult, dynamicResult) {
    const dynamicMutation = dynamicResult.mutated
        ? "YES"
        : "NO";

    const dynamicIdempotent = dynamicResult.idempotent
        ? "YES"
        : "NO";

    const combinedMutation = combineProperty(
        staticResult.staticMutation,
        dynamicMutation
    );

    const combinedIdempotent = combineProperty(
        staticResult.staticIdempotent,
        dynamicIdempotent
    );

    return {
        method: staticResult.method,
        endpoint: staticResult.endpoint,
        staticMutation: staticResult.staticMutation,
        dynamicMutation,
        combinedMutation,
        staticIdempotent: staticResult.staticIdempotent,
        dynamicIdempotent,
        combinedIdempotent
    };
}

function getHttpBaseline(method, property) {
    if (property === "mutation") {
        if (method === "GET") {
            return "NO";
        }

        if (
            method === "POST" ||
            method === "PUT" ||
            method === "DELETE"
        ) {
            return "YES";
        }
    }

    if (property === "idempotent") {
        if (method === "GET" || method === "PUT" || method === "DELETE") {
            return "YES";
        }

        if (method === "POST") {
            return "NO";
        }
    }

    return "UNCERTAIN";
}

function evaluatePrediction(prediction, actual) {
    if (prediction === actual) {
        return "CORRECT";
    }

    return "INCORRECT";
}

function evaluateResult(result) {
    const groundTruth = result.groundTruth;

    if (!groundTruth) {
        return null;
    }

    return {
        endpoint: result.endpoint,
        method: result.method,

        mutation: {
            groundTruth: groundTruth.mutation,
            static: result.staticMutation,
            dynamic: result.dynamicMutation,
            combined: result.combinedMutation,
            httpBaseline: getHttpBaseline(
                result.method,
                "mutation"
            )
        },

        idempotency: {
            groundTruth: groundTruth.idempotent,
            static: result.staticIdempotent,
            dynamic: result.dynamicIdempotent,
            combined: result.combinedIdempotent,
            httpBaseline: getHttpBaseline(
                result.method,
                "idempotent"
            )
        }
    };
}

function calculateAccuracy(results, method, property) {
    let correct = 0;
    let total = 0;

    for (const result of results) {
        const actual = result.groundTruth?.[property];

        if (!actual) {
            continue;
        }

        const prediction = result[property]?.[method];

        if (!prediction) {
            continue;
        }

        total++;

        if (prediction === actual) {
            correct++;
        }
    }

    return {
        correct,
        total,
        accuracy: total === 0
            ? 0
            : correct / total
    };
}

module.exports = {
    combineProperty,
    combineResults,
    getHttpBaseline,
    evaluatePrediction,
    evaluateResult,
    calculateAccuracy
};