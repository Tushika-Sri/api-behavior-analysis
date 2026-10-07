const pool = require("../db");

async function snapshotProducts() {
    const [rows] = await pool.query(
        "Select * from products order by id"
    );
    return rows;
}

function statesEqual(stateA, stateB){
    return JSON.stringify(stateA) === JSON.stringify(stateB);
}

module.exports = {
    snapshotProducts,
    statesEqual
};