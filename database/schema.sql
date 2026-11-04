CREATE DATABASE IF NOT EXISTS api_behavior_analysis;

USE api_behavior_analysis;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    views INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (id, sku, name, price, views)
VALUES
    (1, NULL, 'Laptop', 75000.00, 0),
    (2, NULL, 'Mobile', 25000.00, 0),
    (3, NULL, 'Tablet', 30000.00, 0);