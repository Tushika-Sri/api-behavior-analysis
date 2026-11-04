const pool = require("../db");

async function captureProductsState() {
    const [products] = await pool.query(
        "SELECT * FROM products ORDER BY id"
    );

    const [audits] = await pool.query(
        "SELECT * FROM product_audit ORDER BY id"
    );

    return {
        products,
        audits
    };
}

async function restoreProductsState(state) {
    // Clear audit records first
    await pool.query("DELETE FROM product_audit");

    // Restore products
    await pool.query("DELETE FROM products");

    for (const product of state.products) {
        await pool.query(
            `INSERT INTO products
             (id, sku, name, price, views)
             VALUES (?, ?, ?, ?, ?)`,
            [
                product.id,
                product.sku ?? null,
                product.name,
                product.price,
                product.views ?? 0
            ]
        );
    }

    // Restore audit records
    for (const audit of state.audits) {
        await pool.query(
            `INSERT INTO product_audit
             (id, product_id, action, created_at)
             VALUES (?, ?, ?, ?)`,
            [
                audit.id,
                audit.product_id,
                audit.action,
                audit.created_at
            ]
        );
    }

    await pool.query("ALTER TABLE products AUTO_INCREMENT = 1");
    await pool.query("ALTER TABLE product_audit AUTO_INCREMENT = 1");
}

module.exports = {
    captureProductsState,
    restoreProductsState
};