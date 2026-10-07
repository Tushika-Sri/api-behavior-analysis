const pool = require("../db");

async function captureProductsState() {
    const [rows] = await pool.query(
        "SELECT * FROM products ORDER BY id"
    );
    return rows;
}

async function restoreProductsState(state) {
    await pool.query("DELETE FROM products");

    for (const product of state) {
        await pool.query(
            "INSERT INTO products (id, name, price) VALUES (?, ?, ?)",
            [product.id, product.name, product.price]
        );
    }

    await pool.query(
        "ALTER TABLE products AUTO_INCREMENT = 1"
    );
}

module.exports = {
    captureProductsState,
    restoreProductsState
};