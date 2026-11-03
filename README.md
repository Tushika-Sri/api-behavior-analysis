# API Behavior Analysis

A Node.js research prototype investigating persistent state mutation and operational idempotency in backend APIs through static source-code analysis and controlled dynamic testing.

## Research Objective

To examine how static analysis and dynamic testing can identify behavioral properties of backend API endpoints, and compare their predictions with HTTP-method-based heuristics.

## Methodology

- **Static Analysis:** Uses JavaScript AST parsing with Babel Parser to identify SQL operations and infer API behavior.
- **Dynamic Testing:** Executes API requests and compares database snapshots to detect persistent state changes.
- **Idempotency Testing:** Repeats identical requests to observe whether subsequent executions cause additional database state changes.
- **Combined Analysis:** Compares static and dynamic predictions, marking disagreements as `UNCERTAIN`.
- **Evaluation:** Compares predictions against manually assigned ground-truth labels.

## Technologies

JavaScript, Node.js, Express.js, MySQL, Babel Parser.

## Experimental Setup

The prototype evaluates five API endpoints:

- `GET /products`
- `POST /products`
- `PUT /products/:id`
- `PUT /products/:id/increment`
- `DELETE /products/:id`

## Installation and Setup

**Prerequisites:** Node.js and MySQL.

1. Clone the repository:

```bash
git clone https://github.com/Tushika-Sri/api-behavior-analysis.git
cd api-behavior-analysis
```

2. Install dependencies:

```bash
npm install
```

3. Configure MySQL:

Create the database and required `products` table. Add the database connection details and server port to a `.env` file.

Ensure the database contains the initial product records expected by the experiment.

4. Start the API server:

```bash
node src/server.js
```

5. In a separate terminal, run the experiment:

```bash
node src/runExperiment.js
```

The endpoint predictions and evaluation summary are printed in the terminal.

## Results

| Approach | Mutation | Idempotency |
|---|---:|---:|
| HTTP baseline | 5/5 | 4/5 |
| Static analysis | 5/5 | 5/5 |
| Dynamic testing | 5/5 | 5/5 |
| Combined analysis | 5/5 | 5/5 |

The HTTP-method baseline misclassified the increment endpoint's idempotency. Static and dynamic analysis identified its non-idempotent behavior in this experiment.

## Limitations

- Evaluation is limited to five API endpoints.
- Database-state observation covers only the `products` table.
- Ground-truth labels are manually assigned based on endpoint implementation.
- Static analysis uses simplified JavaScript AST and SQL pattern detection.
- Idempotency is evaluated through persistent database-state changes, not HTTP response equivalence.

The results are preliminary and limited to the current proof of concept.