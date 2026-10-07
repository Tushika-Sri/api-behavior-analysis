const fs = require("fs");
const path = require("path");

const labelsPath = path.join(
    __dirname,
    "labels.json"
);

function loadLabels() {
    const content = fs.readFileSync(
        labelsPath,
        "utf8"
    );

    return JSON.parse(content);
}

function normalizeEndpoint(endpoint) {
    return endpoint.replace(/\/[^/]+$/, "/:id");
}

function getLabel(method, endpoint) {
    const labels = loadLabels();
    const exactKey = `${method} ${endpoint}`;
    if (labels[exactKey]) {
        return labels[exactKey];
    }
    const normalizedEndpoint =
        normalizeEndpoint(endpoint);
    const normalizedKey =
        `${method} ${normalizedEndpoint}`;

    return labels[normalizedKey] || null;
}

function annotateResult(result) {
    const label = getLabel(
        result.method,
        result.endpoint
    );
    if (!label) {
        return {
            ...result,
            groundTruth: null
        };
    }

    return {
        ...result,
        groundTruth: label
    };
}

module.exports = {
    loadLabels,
    getLabel,
    annotateResult
};