/*
 * Portions of this file are derived from dotenv-expand
 * Copyright (c) 2016, Scott Motte
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
interface ExpandOptions {
  parsed: Record<string, string>;
  processEnv?: Record<string, string>;
}

function resolveEscaped(input: string): string {
  return input.replace(/\\\$/g, "$");
}

function interpolate(
  raw: string,
  sysEnv: Record<string, string>,
  accumulated: Record<string, string>
): string {
  const merged: Record<string, string> = { ...accumulated, ...sysEnv };
  const pattern = /(?<!\\)\${([^{}]+)}|(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)/g;
  let output = raw;
  let hit: RegExpExecArray | null;
  const visited = new Set<string>();

  while ((hit = pattern.exec(output)) !== null) {
    visited.add(output);
    const [token, bracedExpr, plainExpr] = hit;
    const expr = bracedExpr || plainExpr;

    const opPattern = /(:\+|\+|:-|-)/;
    const opHit = expr.match(opPattern);
    const splitter = opHit ? opHit[0] : null;
    const segments = expr.split(splitter as string);

    let fallback: string;
    let resolved: string | undefined;
    const varName = segments.shift() as string;

    if ([":+", "+"].includes(splitter as string)) {
      fallback = merged[varName] ? segments.join(splitter as string) : "";
      resolved = undefined;
    } else {
      fallback = segments.join(splitter as string);
      resolved = merged[varName];
    }

    if (resolved) {
      if (visited.has(resolved)) {
        output = output.replace(token, fallback);
      } else {
        output = output.replace(token, resolved);
      }
    } else {
      output = output.replace(token, fallback);
    }

    if (output === accumulated[varName]) {
      break;
    }

    pattern.lastIndex = 0;
  }

  return output;
}

export function expandEnv(opts: ExpandOptions): ExpandOptions {
  const accumulated: Record<string, string> = {};
  let sysEnv: Record<string, string> = process.env as Record<string, string>;

  if (opts && opts.processEnv != null) {
    sysEnv = opts.processEnv;
  }

  for (const k in opts.parsed) {
    let val = opts.parsed[k];

    if (sysEnv[k] && sysEnv[k] !== val) {
      val = sysEnv[k];
    } else {
      val = interpolate(val, sysEnv, accumulated);
    }

    opts.parsed[k] = resolveEscaped(val);
    accumulated[k] = resolveEscaped(val);
  }

  for (const k in opts.parsed) {
    sysEnv[k] = opts.parsed[k];
  }

  return opts;
}
