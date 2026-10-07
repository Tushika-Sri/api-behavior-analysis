# API Behavior Analysis

A Node.js research prototype that analyzes backend API behavior using static source-code analysis and controlled dynamic testing.

## Features

* JavaScript AST-based static analysis
* Database mutation detection
* Idempotency testing through repeated API requests
* Database state snapshots
* Static vs dynamic result comparison
* Ground-truth evaluation

## Technologies

* Node.js
* Express.js
* MySQL
* JavaScript
* Babel Parser

## API Endpoints

* `GET /products`
* `POST /products`
* `PUT /products/:id`
* `PUT /products/:id/increment`
* `DELETE /products/:id`

## Results

| Approach          | Mutation | Idempotency |
| ----------------- | -------: | ----------: |
| HTTP baseline     |      5/5 |         4/5 |
| Static analysis   |      5/5 |         5/5 |
| Dynamic testing   |      5/5 |         5/5 |
| Combined analysis |      5/5 |         5/5 |

Results are from a small 5-endpoint proof of concept.

## Project Structure

```text
src/
├── analyzer/
├── testing/
├── groundTruth/
├── routes/
└── runExperiment.js
```
