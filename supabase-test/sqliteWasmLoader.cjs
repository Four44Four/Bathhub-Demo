"use strict";

/** Loads sqlite-wasm via Node's native dynamic import (Jest cannot transform its .mjs entry). */
let initPromise = null;

async function loadSqliteWasmModule() {
  if (!initPromise) {
    initPromise = import("@sqlite.org/sqlite-wasm").then((mod) => mod.default());
  }
  return initPromise;
}

module.exports = { loadSqliteWasmModule };
