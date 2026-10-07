const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const sourcePath = path.join(
    __dirname,
    "../routes/routes.js"
);

function walk(node, callback) {
    if (!node || typeof node !== "object") {
        return;
    }

    callback(node);

    for (const key of Object.keys(node)) {
        const value = node[key];

        if (Array.isArray(value)) {
            for (const child of value) {
                walk(child, callback);
            }
        } else if (
            value &&
            typeof value === "object"
        ) {
            walk(value, callback);
        }
    }
}

function resolveSqlText(
    sqlArgument,
    sqlVariables
) {
    if (!sqlArgument) {
        return null;
    }

    if (
        sqlArgument.type === "StringLiteral"
    ) {
        return sqlArgument.value;
    }

    if (
        sqlArgument.type === "Identifier"
    ) {
        return (
            sqlVariables[sqlArgument.name] ||
            null
        );
    }

    if (
        sqlArgument.type === "TemplateLiteral"
    ) {
        if (
            sqlArgument.expressions &&
            sqlArgument.expressions.length > 0
        ) {
            return null;
        }

        return sqlArgument.quasis
            .map(part => part.value.raw)
            .join(" ");
    }

    return null;
}

function getSqlOperation(
    node,
    sqlVariables
) {
    if (
        node.type !== "CallExpression" ||
        node.callee.type !== "MemberExpression"
    ) {
        return null;
    }

    if (
        node.callee.object.type !== "Identifier" ||
        node.callee.object.name !== "pool" ||
        node.callee.property.type !== "Identifier" ||
        node.callee.property.name !== "query"
    ) {
        return null;
    }

    const sqlArgument =
        node.arguments[0];

    const sqlText =
        resolveSqlText(
            sqlArgument,
            sqlVariables
        );

    if (!sqlText) {
        return {
            operation: "UNKNOWN",
            sql: null
        };
    }

    const match = sqlText.match(
        /^\s*(SELECT|INSERT|UPDATE|DELETE)\b/i
    );

    if (match) {
        return {
            operation:
                match[1].toUpperCase(),
            sql: sqlText
        };
    }

    return {
        operation: "UNKNOWN",
        sql: sqlText
    };
}

function collectSqlVariables(ast) {
    const sqlVariables = {};

    walk(ast, node => {
        if (node.type !== "VariableDeclarator") {
            return;
        }

        if (node.id.type !== "Identifier") {
            return;
        }

        const init = node.init;

        if (!init) {
            return;
        }

        if (init.type === "StringLiteral") {
            sqlVariables[node.id.name] =
                init.value;

            return;
        }

        if (init.type === "TemplateLiteral" && init.expressions.length === 0) {
            sqlVariables[node.id.name] = init.quasis
                .map(part => part.value.raw)
                .join(" ");
        }
    });

    return sqlVariables;
}

function getMutationFromOperations(
    operations
) {
    if (operations.length === 0) {
        return "UNCERTAIN";
    }

    if (operations.every(operation => operation === "SELECT")) {
        return "NO";
    }

    if (operations.some(operation =>
        [
            "INSERT",
            "UPDATE",
            "DELETE"
        ].includes(operation)
    )
    ) {
        return "YES";
    }

    return "UNCERTAIN";
}

function isIncrementOrDecrement(sql) {
    if (!sql) {
        return false;
    }

    return /\bSET\b[\s\S]*=\s*[\w.]+\s*[\+\-]\s*\d+/i
        .test(sql);
}

function inferIdempotency(method, queries, staticMutation) {
    if (method === "GET" && staticMutation === "NO") {
        return "YES";
    }

    if (method === "PUT" && queries.some(query => query.operation === "UPDATE")) {
        const updateQueries = queries.filter(query => query.operation === "UPDATE");

        for (const query of updateQueries) {
            if (isIncrementOrDecrement(query.sql)) {
                return "NO";
            }
        }

        return "YES";
    }

    if (method === "DELETE" && queries.some(query => query.operation === "DELETE")
    ) {
        return "YES";
    }

    if (method === "POST" && queries.some(query => query.operation === "INSERT")) {
        return "NO";
    }

    return "UNCERTAIN";
}

function analyzeRoutes() {
    const sourceCode =
        fs.readFileSync(
            sourcePath,
            "utf8"
        );

    const ast = parser.parse(
        sourceCode,
        {
            sourceType: "commonjs"
        }
    );

    const sqlVariables = collectSqlVariables(ast);
    const results = [];
    walk(ast, node => {
        if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
            return;
        }

        if (node.callee.object.type !== "Identifier" || node.callee.object.name !== "router") {
            return;
        }

        const methodNode =
            node.callee.property;

        if (
            methodNode.type !==
            "Identifier" ||
            ![
                "get",
                "post",
                "put",
                "delete"
            ].includes(
                methodNode.name
            )
        ) {
            return;
        }

        const routeNode =
            node.arguments[0];

        if (
            !routeNode ||
            routeNode.type !==
            "StringLiteral"
        ) {
            return;
        }

        const queries = [];

        walk(node, child => {
            const query =
                getSqlOperation(
                    child,
                    sqlVariables
                );

            if (query) {
                queries.push(query);
            }
        });

        const operations = queries
            .map(query => query.operation)
            .filter((operation, index, array) =>
                !array.slice(0, index).includes(operation)
            );

        const staticMutation = getMutationFromOperations(operations);

        const staticIdempotent = inferIdempotency(
            methodNode.name.toUpperCase(),
            queries,
            staticMutation
        );

        results.push({
            method:
                methodNode.name.toUpperCase(),
            endpoint:
                routeNode.value,
            databaseOperations:
                operations,
            databaseQueries:
                queries,
            staticMutation,
            staticIdempotent
        });
    });

    return results;
}

module.exports = {
    analyzeRoutes
};