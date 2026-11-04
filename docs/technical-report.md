# API Behavior Analysis: Technical Report

**Tushika Srivastava**  
**November 2026**

## Abstract

Automated clients, including LLM agents, need to determine whether an API call changes persistent state and whether it is safe to repeat. HTTP method conventions are often used to infer these properties, but they do not always reflect actual endpoint behavior. This report presents a Node.js prototype that classifies ten Express.js and MySQL API endpoints for persistent state mutation and operational idempotency using HTTP-method heuristics, static AST analysis, dynamic database-snapshot testing, and a combined approach that returns `UNCERTAIN` when static and dynamic evidence conflict or sufficient evidence is unavailable.

Against manually labeled ground truth, the HTTP baseline correctly classified 8/10 mutation cases and 6/10 idempotency cases. Static analysis achieved 9/9 correct definite predictions for mutation (90% coverage) and 7/8 for idempotency (80% coverage). Dynamic testing correctly classified 10/10 endpoints for both properties under the tested conditions. Combined analysis achieved 9/9 for mutation (90% coverage) and 7/7 for idempotency (70% coverage). These preliminary results are limited to ten endpoints, one database schema, and manually assigned labels based on a database-state-based definition of behavior.

## 1. Introduction

Automated clients and LLM-based agents may need to decide whether an API request can be safely retried, whether it modifies persistent data, and what side effects it may have. HTTP methods alone can mislead, because an endpoint's implementation may behave differently from its method convention. This project investigates whether static source-code analysis and controlled dynamic testing provide additional evidence about API behavior.

The study focuses on two properties:

- **Mutation:** whether an API endpoint changes persistent database state.
- **Idempotency:** whether repeating the same request produces no additional persistent database-state change after the first execution.

This is an operational definition of idempotency, based on database-state change after repeated identical requests. It differs from definitions based on response equivalence.

Four approaches are compared against manually assigned ground-truth labels: (1) an HTTP-method-based baseline, (2) static source-code analysis, (3) dynamic testing, and (4) combined analysis, which returns `UNCERTAIN` when static and dynamic evidence conflict or sufficient evidence is unavailable.

## 2. Method

**Prototype.** A Node.js and Express.js application with MySQL (via `mysql2`) provides endpoints that read, insert, update, increment, and delete product records.

- **Static analysis:** parses the source code with Babel Parser, examines the Abstract Syntax Tree (AST), and uses SQL and source-code patterns to infer whether an endpoint may mutate state and whether its operations appear idempotent.
- **Dynamic testing:** sends controlled HTTP requests and compares database snapshots before and after execution, and after a repeated identical request.
- **Combined analysis:** merges static and dynamic predictions, and returns `UNCERTAIN` rather than forcing a prediction when the evidence conflicts or is insufficient.
- **Ground truth:** labels are assigned manually from the endpoint implementations.

**Experiment.** Ten endpoints are evaluated for both properties. The `products` and `product_audit` tables are observed for state changes, and the database is restored to its original snapshot between controlled tests. Predictions from each approach are compared against the ground-truth labels.

## 3. Results

Accuracy is calculated over definite predictions only. Coverage is the proportion of endpoints for which an approach produced a definite prediction.

### 3.1 Mutation

| Approach | Accuracy (Definite Predictions) | Coverage |
|---|---:|---:|
| HTTP baseline | 8/10 (80.0%) | 10/10 (100.0%) |
| Static analysis | 9/9 (100.0%) | 9/10 (90.0%) |
| Dynamic testing | 10/10 (100.0%) | 10/10 (100.0%) |
| Combined analysis | 9/9 (100.0%) | 9/10 (90.0%) |

### 3.2 Idempotency

| Approach | Accuracy (Definite Predictions) | Coverage |
|---|---:|---:|
| HTTP baseline | 6/10 (60.0%) | 10/10 (100.0%) |
| Static analysis | 7/8 (87.5%) | 8/10 (80.0%) |
| Dynamic testing | 10/10 (100.0%) | 10/10 (100.0%) |
| Combined analysis | 7/7 (100.0%) | 7/10 (70.0%) |

### 3.3 Per-Endpoint Results

Each cell shows the mutation and idempotency predictions in that order (M / I). `UNCERTAIN` means the approach did not produce a definite classification.

| Endpoint | Ground truth | HTTP baseline | Static | Dynamic | Combined |
|---|---|---|---|---|---|
| GET /products | NO / YES | NO / YES | NO / YES | NO / YES | NO / YES |
| POST /products | YES / NO | YES / NO | YES / NO | YES / NO | YES / NO |
| PUT /products/:id | YES / YES | YES / YES | YES / YES | YES / YES | YES / YES |
| PUT /products/:id/increment | YES / NO | YES / YES | YES / NO | YES / NO | YES / NO |
| DELETE /products/:id | YES / YES | YES / YES | YES / YES | YES / YES | YES / YES |
| GET /products/:id/view | YES / NO | NO / YES | YES / UNCERTAIN | YES / NO | YES / UNCERTAIN |
| GET /products/:id/details | YES / NO | NO / YES | UNCERTAIN / UNCERTAIN | YES / NO | UNCERTAIN / UNCERTAIN |
| POST /products/upsert | YES / YES | YES / NO | YES / NO | YES / YES | YES / UNCERTAIN |
| POST /products/:id/audit | YES / NO | YES / NO | YES / NO | YES / NO | YES / NO |
| PATCH /products/:id/price | YES / YES | YES / YES | YES / YES | YES / YES | YES / YES |

## 4. Findings

**Mutation.** The HTTP baseline misclassified two endpoints, `GET /products/:id/view` and `GET /products/:id/details`, as non-mutating, although both modify persistent state despite using GET. Dynamic testing detected both. Static analysis detected the mutation in the view endpoint but returned `UNCERTAIN` for the details endpoint, whose behavior involves an imported helper function that the current analyzer does not resolve.

**Idempotency.** The HTTP baseline misclassified four endpoints:

- `PUT /products/:id/increment` was assumed idempotent, but it increments a stored value on every execution.
- `GET /products/:id/view` and `GET /products/:id/details` were assumed idempotent, but each call changes persistent state.
- `POST /products/upsert` was assumed non-idempotent, but repeating it leaves the state unchanged under the tested conditions.

Static analysis also classified the upsert endpoint as non-idempotent, while dynamic testing classified it as idempotent. Combined analysis returned `UNCERTAIN` for it because the two predictions disagreed. Static analysis returned `UNCERTAIN` for the idempotency of both GET endpoints that mutate state, and combined analysis retained that uncertainty.

**Overall.** HTTP methods alone do not reliably describe actual endpoint behavior. Static analysis provides implementation-level evidence but is limited by imported helper functions and simplified pattern detection. Dynamic testing provides evidence from observed state changes. In this experiment dynamic testing alone was correct on every endpoint, so combining it with static analysis did not improve accuracy; it lowered coverage by returning `UNCERTAIN` where static evidence was missing or disagreed. The combined approach is therefore best viewed as a conservative flag, and its value needs a larger benchmark that includes cases where dynamic testing could miss behavior, such as input-dependent mutations.

## 5. Limitations

- Evaluation is limited to ten API endpoints.
- Database-state observation covers only the `products` and `product_audit` tables.
- Ground-truth labels are manually assigned based on endpoint implementation.
- Ground-truth labels and dynamic testing share a database-state-based definition, which may partly influence the measured dynamic testing accuracy.
- Static analysis uses simplified JavaScript AST and SQL pattern detection and does not comprehensively resolve behavior across imported helper functions.
- Idempotency is evaluated through observed database-state changes, not HTTP response equivalence.
- Dynamic results are limited to the tested requests, inputs, and database conditions.

The results are preliminary and limited to the current proof of concept. They should not be interpreted as evidence of general accuracy across arbitrary APIs.

## 6. Conclusion

This project implements a research prototype for examining mutation and idempotency in backend APIs through static source-code analysis and controlled dynamic testing. The experiment shows that implementation-level analysis and observed database-state changes can provide behavioral information beyond HTTP-method heuristics, and it highlights the importance of reporting both accuracy and coverage when an approach can return uncertain classifications. Further work could extend the prototype to more endpoints, multiple tables and caches, response-equivalence idempotency, broader JavaScript patterns, and more comprehensive side-effect detection.

## Repository

Source code and experiment implementation: https://github.com/Tushika-Sri/api-behavior-analysis