const {recordProductDetailsView} = require("./productHelpers");
const express = require("express");
const pool = require("../db");
const router = express.Router();

router.get("/products", async (req, res) => {
    try {
        const [rows] = await pool.query('Select * from products order by id');
        res.json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: 'Database error'
        });
    }
});

router.post("/products", async (req, res) => {
    try {
        const { name, price } = req.body;
        const [result] = await pool.query(
            "INSERT INTO products (name, price) VALUES (?, ?)", [name, price]
        );
        res.status(201).json({ id: result.insertId, name, price });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

router.put("/products/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        const [result] = await pool.query(
            "UPDATE products SET name = ?, price = ? WHERE id = ?", [name, price, id]
        );
        res.json({ id, name, price, affectedRows: result.affectedRows });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

router.put("/products/:id/increment", async (req, res) => { 
    try { const { id } = req.params; 
    const [result] = await pool.query( 
        "UPDATE products SET price = price + 100 WHERE id = ?", [id] 
    ); 
    res.json({ id, affectedRows: result.affectedRows }); 
} catch (error) { 
    console.log(error); 
    res.status(500).json({ 
        error: "Database error" 
    });
 } 
});

router.delete("/products/:id", async (req, res) => { 
    try { 
        const { id } = req.params;
        const [result] = await pool.query( 
        "DELETE FROM products WHERE id = ?", [id] ); 
        if (result.affectedRows === 0) { 
            return res.status(404).json({
                 error: "Product not found" 
                });
             } 
             res.json({ 
                message: "Product deleted", id 
            });
         } catch (error) { 
            console.log(error); 
            res.status(500).json({ 
                error: "Database error" 
            }); 
        } 
    });

router.get("/products/:id/view", async (req, res) => {
    try {
        const { id } = req.params;

        // Increment the product's view counter.
        const [result] = await pool.query(
            "UPDATE products SET views = views + 1 WHERE id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        // Retrieve the updated product.
        const [rows] = await pool.query(
            "SELECT * FROM products WHERE id = ?",
            [id]
        );

        res.json(rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

router.get("/products/:id/details", async (req, res) => {
    try {
        const { id } = req.params;

        const product = await recordProductDetailsView(id);

        if (!product) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        res.json(product);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

router.post("/products/upsert", async (req, res) => {
    try {
        const { sku, name, price } = req.body;

        const [result] = await pool.query(
            `INSERT INTO products (sku, name, price)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             price = VALUES(price)`,
            [sku, name, price]
        );

        res.json({
            message: "Product inserted or updated",
            sku,
            name,
            price,
            affectedRows: result.affectedRows
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

router.post("/products/:id/audit", async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await pool.query(
            "SELECT id FROM products WHERE id = ?",
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        await pool.query(
            `INSERT INTO product_audit (product_id, action)
             VALUES (?, ?)`,
            [id, "PRODUCT_AUDIT"]
        );

        res.json({
            message: "Audit record created",
            productId: Number(id)
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Database error" });
    }
});

router.patch("/products/:id/price", async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;

        if (price === undefined || !Number.isFinite(Number(price))) {
            return res.status(400).json({
                error: "A valid price is required"
            });
        }

        const [result] = await pool.query(
            "UPDATE products SET price = ? WHERE id = ?",
            [Number(price), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        const [rows] = await pool.query(
            "SELECT * FROM products WHERE id = ?",
            [id]
        );

        res.json(rows[0]);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Database error" });
    }
});

module.exports = router;