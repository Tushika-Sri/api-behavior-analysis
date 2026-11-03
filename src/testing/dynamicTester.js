const { snapshotProducts, statesEqual } = require("./databaseSnapshot");

async function sendRequest(method, url, body = null) {
    const options = {
        method,
        headers: {}
    };

    if (body !== null) {
        options.headers["Content-Type"] = "application/json",
            options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    const responseText = await response.text();

    let data;

    try {
        data = JSON.parse(responseText);
    } catch {
        data = responseText;
    }

    return {
        status: response.status,
        ok: response.ok,
        data
    };
}

async function testMutation(method, url, body = null) {
    const before = await snapshotProducts();
    const response = await sendRequest(method, url, body);
    if (!response.ok) {
        return {
            before,
            response,
            mutated: null,
            result: "UNCERTAIN",
            reason: `Request failed with status ${response.status}`
        };
    }
    const after = await snapshotProducts();
    const mutated = !statesEqual(before, after);

    return {
        before,
        after,
        response,
        mutated
    };
}

async function testIdempotency(method, url, body = null) {
    const before = await snapshotProducts();
    const firstResponse = await sendRequest(method, url, body);
    if (!firstResponse.ok) {
        return {
            before,
            firstResponse,
            idempotent: null,
            result: "UNCERTAIN",
            reason: `First request failed with status ${firstResponse.status}`
        };
    }
    const afterFirst = await snapshotProducts();
    const secondResponse = await sendRequest(method, url, body);
    if (!secondResponse.ok &&
        !(method === "DELETE" && secondResponse.status === 404)
    ) {
        return {
            before,
            firstResponse,
            afterFirst,
            secondResponse,
            idempotent: null,
            result: "UNCERTAIN",
            reason: `Second request failed with status ${secondResponse.status}`
        };
    }
    const afterSecond = await snapshotProducts();
    const secondExecutionChangedState = !statesEqual(afterFirst, afterSecond);
    const idempotent = !secondExecutionChangedState;

    return {
        before,
        firstResponse,
        afterFirst,
        secondResponse,
        afterSecond,
        idempotent
    };
}

module.exports = {
    sendRequest,
    testMutation,
    testIdempotency
};