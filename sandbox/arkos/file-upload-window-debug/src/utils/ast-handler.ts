// error-analyzer.ts
import * as swc from "@swc/core";
import fs from "fs";
//@ts-ignore
import { globSync } from "glob";

interface ErrorInfo {
  message: any;
  code: any;
  line?: number;
}

const fileASTs = new Map<string, swc.Module>();

// Parse all files at startup
export async function initializeASTs() {
  const files = globSync("src/**/*.ts");

  for (const file of files) {
    const code = fs.readFileSync(file, "utf8");
    // console.log(swc);
    const ast = await swc.parse(code, {
      syntax: "typescript",
      tsx: true,
    });
    fileASTs.set(file, ast);
  }
}

export function getHandlerErrors(handlerFunction: Function): ErrorInfo[] {
  const name = handlerFunction.name;

  for (const [file, ast] of fileASTs) {
    const errors = findErrorsInAST(ast, name);
    if (errors.length) return errors;
  }

  return [];
}

function findErrorsInAST(ast: swc.Module, functionName: string): ErrorInfo[] {
  const errors: ErrorInfo[] = [];
  const visited = new Set<string>();

  function visit(node: any, inTarget = false) {
    if (!node || typeof node !== "object") return;

    // Check if we found the target function
    if (
      node.type === "FunctionDeclaration" &&
      node.identifier?.value === functionName
    ) {
      inTarget = true;
    }

    // Find throw statements
    if (inTarget && node.type === "ThrowStatement") {
      const arg = node.argument;

      // Check for: throw new AppError(...)
      if (
        arg?.type === "NewExpression" &&
        arg.callee?.type === "Identifier" &&
        arg.callee.value === "AppError"
      ) {
        const args = arg.arguments || [];
        const message = extractLiteral(args[0]?.expression);
        const code = extractLiteral(args[1]?.expression);

        // if (message !== null && code !== null) {
        errors.push({ message, code });
        // }
      }
    }

    // Follow function calls
    if (inTarget && node.type === "CallExpression") {
      const calleeName =
        node.callee?.type === "Identifier" ? node.callee.value : null;
      if (calleeName && !visited.has(calleeName)) {
        visited.add(calleeName);
        // Find and traverse the called function
        for (const [_, otherAst] of fileASTs) {
          errors.push(...findErrorsInAST(otherAst, calleeName));
        }
      }
    }

    // Traverse children
    for (const key in node) {
      if (Array.isArray(node[key])) {
        node[key].forEach((child: any) => visit(child, inTarget));
      } else if (typeof node[key] === "object") {
        visit(node[key], inTarget);
      }
    }
  }

  visit(ast.body);
  return errors;
}

function extractLiteral(node: any): string | number | null {
  if (!node) return null;

  if (node.type === "StringLiteral") return node.value;
  if (node.type === "NumericLiteral") return node.value;
  if (node.type === "TemplateLiteral" && node.quasis?.length === 1) {
    return node.quasis[0].cooked;
  }

  return node;
}
