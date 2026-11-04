require("dotenv").config();
const { analyzeRoutes } = require("./analyzer/staticAnalyzer");
const { testMutation, testIdempotency } = require("./testing/dynamicTester");
const { captureProductsState, restoreProductsState } = require("./testing/testEnvironment");
const { combineResults, evaluateResult } = require("./analyzer/combinedAnalyzer");
const { annotateResult } = require("./groundTruth/annotator");

const BASE_URL = process.env.BASE_URL;

const testCases = [
    { method: "GET", endpoint: "/products" },
    { method: "POST", endpoint: "/products", body: { name: "Test Product", price: 1000 } },
    { method: "PUT", endpoint: "/products/1", body: { name: "Laptop Updated", price: 80000 } },
    { method: "PUT", endpoint: "/products/1/increment" },
    { method: "DELETE", endpoint: "/products/3" },
    { method: "GET", endpoint: "/products/1/view" },
    { method: "GET", endpoint: "/products/1/details" },
    { method: "POST", endpoint: "/products/upsert", body: { sku: "TEST-SKU-001", name: "Upsert Test Product", price: 1500 } },
    { method: "POST", endpoint: "/products/1/audit" },
    { method: "PATCH", endpoint: "/products/1/price", body: { price: 2500 } }
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

function calculateMetrics(results, property, method) {
    let correct = 0;
    let definite = 0;
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

        if (!actual) {
            continue;
        }

        total++;

        if (!prediction || prediction === "UNCERTAIN") {
            continue;
        }

        definite++;

        if (actual === prediction) {
            correct++;
        }
    }

    const uncertain = total - definite;

    const accuracy =
        definite > 0
            ? ((correct / definite) * 100).toFixed(1)
            : "N/A";

    const coverage =
        total > 0
            ? ((definite / total) * 100).toFixed(1)
            : "N/A";

    return {
        accuracy: `${correct}/${definite} (${accuracy}%)`,
        coverage: `${definite}/${total} (${coverage}%)`,
        uncertain: `${uncertain}/${total}`
    };
}

function printEvaluation(results) {
    const methods = [
        { label: "HTTP baseline", key: "httpBaseline" },
        { label: "Static analysis", key: "static" },
        { label: "Dynamic testing", key: "dynamic" },
        { label: "Combined analysis", key: "combined" }
    ];

    function printProperty(property, title) {
        console.log(`\n${title}`);
        console.log(
            "Method".padEnd(22) +
            "Accuracy".padEnd(22) +
            "Coverage".padEnd(22) +
            "Uncertain"
        );

        for (const method of methods) {
            const metrics = calculateMetrics(
                results,
                property,
                method.key
            );

            console.log(
                method.label.padEnd(22) +
                metrics.accuracy.padEnd(22) +
                metrics.coverage.padEnd(22) +
                metrics.uncertain
            );
        }
    }

    console.log("\nEvaluation Summary");

    printProperty("mutation", "Mutation");
    printProperty("idempotency", "Idempotency");
}

async function runExperiment() {
    const staticResults = analyzeRoutes();
    const initialState = await captureProductsState();
    const finalResults = [];

    try {
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

        console.log(JSON.stringify(finalResults, null, 2));
        printEvaluation(finalResults);

    } finally {
        await restoreProductsState(initialState);
        console.log("\nOriginal database state restored.");
    }
}

runExperiment().catch(error => {
    console.error(error);
});