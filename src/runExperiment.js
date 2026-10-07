require("dotenv").config();
const { analyzeRoutes } = require("./analyzer/staticAnalyzer");
const { testMutation, testIdempotency } = require("./testing/dynamicTester");
const { captureProductsState, restoreProductsState } = require("./testing/testEnvironment");
const { combineResults, evaluateResult } = require("./analyzer/combinedAnalyzer");
const { annotateResult } = require("./groundTruth/annotator");

const BASE_URL = process.env.BASE_URL;;

const testCases = [
    { method: "GET", endpoint: "/products" },
    { method: "POST", endpoint: "/products", body: { name: "Test Product", price: 1000 } },
    { method: "PUT", endpoint: "/products/1", body: { name: "Laptop Updated", price: 80000 } },
    { method: "PUT", endpoint: "/products/1/increment" },
    { method: "DELETE", endpoint: "/products/3" }
];

function matchesRoute(staticEndpoint, testEndpoint) {
    const staticParts = staticEndpoint.split("/");
    const testParts = testEndpoint.split("/");

    if (staticParts.length !== testParts.length) {
        return false;
    }

    for (let i = 0; i < staticParts.length; i++) {
        if (staticParts[i].startsWith(":")) {
            continue;
        }

        if (staticParts[i] !== testParts[i]) {
            return false;
        }
    }

    return true;
}

function calculateAccuracy(results, property, method) {
    let correct = 0;
    let total = 0;

    const groundTruthProperty =
        property === "idempotency"
            ? "idempotent"
            : property;

    for (const result of results) {
        const actual =
            result.groundTruth?.[groundTruthProperty];

        const prediction =
            result.evaluation?.[property]?.[method];

        if (!actual || !prediction) {
            continue;
        }

        total++;

        if (actual === prediction) {
            correct++;
        }
    }

    return `${correct}/${total}`;
}

function printEvaluation(results) {
    console.log("\nEvaluation Summary\n");

    console.log("Mutation");
    console.log(
        "HTTP baseline:",
        calculateAccuracy(results, "mutation", "httpBaseline")
    );
    console.log(
        "Static analysis:",
        calculateAccuracy(results, "mutation", "static")
    );
    console.log(
        "Dynamic testing:",
        calculateAccuracy(results, "mutation", "dynamic")
    );
    console.log(
        "Combined analysis:",
        calculateAccuracy(results, "mutation", "combined")
    );

    console.log("\nIdempotency");
    console.log(
        "HTTP baseline:",
        calculateAccuracy(results, "idempotency", "httpBaseline")
    );
    console.log(
        "Static analysis:",
        calculateAccuracy(results, "idempotency", "static")
    );
    console.log(
        "Dynamic testing:",
        calculateAccuracy(results, "idempotency", "dynamic")
    );
    console.log(
        "Combined analysis:",
        calculateAccuracy(results, "idempotency", "combined")
    );
}

async function runExperiment() {
    const staticResults = analyzeRoutes();
    const initialState = await captureProductsState();
    const finalResults = [];

    for (const testCase of testCases) {
        await restoreProductsState(initialState);

        const staticResult = staticResults.find(
            result =>
                result.method === testCase.method &&
                matchesRoute(result.endpoint, testCase.endpoint)
        );

        if (!staticResult) {
            continue;
        }

        const url = `${BASE_URL}${testCase.endpoint}`;

        const mutationResult = await testMutation(
            testCase.method,
            url,
            testCase.body
        );

        await restoreProductsState(initialState);

        const idempotencyResult = await testIdempotency(
            testCase.method,
            url,
            testCase.body
        );

        const dynamicResult = {
            mutated: mutationResult.mutated,
            idempotent: idempotencyResult.idempotent
        };

        const combinedResult = combineResults(
            staticResult,
            dynamicResult
        );

        const annotatedResult = annotateResult(combinedResult);
        const evaluation = evaluateResult(annotatedResult);

        finalResults.push({
            ...annotatedResult,
            evaluation
        });
    }

    await restoreProductsState(initialState);
    console.log(JSON.stringify(finalResults, null, 2));
    printEvaluation(finalResults);
}

runExperiment().catch(error => {
    console.error(error);
});