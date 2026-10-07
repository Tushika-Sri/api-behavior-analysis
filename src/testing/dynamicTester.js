const {snapshotProducts, statesEqual} = require("./databaseSnapshot");

async function sendRequest(method, url, body = null) {
    const options = {
        method,
        headers:{}
    };

    if(body !== null){
        options.headers["Content-Type"] = "application/json",
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    let data;
    
    try{
        data = await response.json();
    } catch {
        data = await response.text();
    }

     return {
        status: response.status,
        data
     };
}

async function testMutation(method, url, body = null) {
    const before = await snapshotProducts();
    const response = await sendRequest(method, url, body);
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
     const afterFirst = await snapshotProducts();
     const secondResponse = await sendRequest(method, url, body);
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