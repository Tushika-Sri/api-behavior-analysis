const pool = require("../db");

async function snapshotProducts() {
    const [products] = await pool.query(
        "Select * from products order by id"
    );
    const [audits] = await pool.query(
        "SELECT * FROM product_audit ORDER BY id"
    );

    return {
        products,
        audits
    };
}

function statesEqual(stateA, stateB) {
    return JSON.stringify(stateA) === JSON.stringify(stateB);
}

module.exports = {
    snapshotProducts,
    statesEqual
};