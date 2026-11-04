const pool = require("../db");

async function recordProductDetailsView(id) {
    await pool.query(
        "UPDATE products SET views = views + 1 WHERE id = ?",
        [id]
    );

    const [rows] = await pool.query(
        "SELECT * FROM products WHERE id = ?",
        [id]
    );

    return rows[0];
}

module.exports = {
    recordProductDetailsView
};