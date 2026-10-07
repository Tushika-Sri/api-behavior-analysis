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

module.exports = router;