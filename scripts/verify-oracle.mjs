#!/usr/bin/env node

import { readFileSync } from "node:fs";

const appText = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function readConstLiteral(name) {
  const start = appText.indexOf(`const ${name} = `);
  if (start === -1) throw new Error(`Missing const ${name}`);
  const literalStart = start + `const ${name} = `.length;
  const end = appText.indexOf(";\n", literalStart);
  if (end === -1) throw new Error(`Cannot parse const ${name}`);
  const literal = appText.slice(literalStart, end);
  return Function(`"use strict"; return (${literal});`)();
}

const trigramOrder = readConstLiteral("trigramOrder");
const kingWenTable = readConstLiteral("kingWenTable");
const hexagrams = readConstLiteral("hexagrams");

const expectedTrigramOrder = ["111", "110", "101", "100", "011", "010", "001", "000"];
const expectedKingWenTable = {
  "111": [1, 43, 14, 34, 9, 5, 26, 11],
  "110": [10, 58, 38, 54, 61, 60, 41, 19],
  "101": [13, 49, 30, 55, 37, 63, 22, 36],
  "100": [25, 17, 21, 51, 42, 3, 27, 24],
  "011": [44, 28, 50, 32, 57, 48, 18, 46],
  "010": [6, 47, 64, 40, 59, 29, 4, 7],
  "001": [33, 31, 56, 62, 53, 39, 52, 15],
  "000": [12, 45, 35, 16, 20, 8, 23, 2],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function lineInfo(value) {
  const map = {
    6: { name: "老陰", bit: 0, changedBit: 1, moving: true },
    7: { name: "少陽", bit: 1, changedBit: 1, moving: false },
    8: { name: "少陰", bit: 0, changedBit: 0, moving: false },
    9: { name: "老陽", bit: 1, changedBit: 0, moving: true },
  };
  return map[value];
}

function hexFromBits(bits) {
  const lower = bits.slice(0, 3).join("");
  const upper = bits.slice(3, 6).join("");
  const upperIndex = trigramOrder.indexOf(upper);
  return {
    number: kingWenTable[lower][upperIndex],
    name: hexagrams[kingWenTable[lower][upperIndex]][0],
    upper,
    lower,
  };
}

function readingFromLines(lines) {
  const originalBits = lines.map((value) => lineInfo(value).bit);
  const changedBits = lines.map((value) => lineInfo(value).changedBit);
  return {
    primary: hexFromBits(originalBits),
    changed: hexFromBits(changedBits),
    moving: lines
      .map((value, index) => (lineInfo(value).moving ? index + 1 : null))
      .filter(Boolean),
  };
}

assert(JSON.stringify(trigramOrder) === JSON.stringify(expectedTrigramOrder), "Trigram order changed");
assert(JSON.stringify(kingWenTable) === JSON.stringify(expectedKingWenTable), "King Wen table mismatch");

for (const [lower, expectedRow] of Object.entries(expectedKingWenTable)) {
  expectedRow.forEach((expectedNumber, index) => {
    const upper = trigramOrder[index];
    const actual = hexFromBits([...lower, ...upper]);
    assert(actual.number === expectedNumber, `Hexagram mismatch lower=${lower} upper=${upper}`);
  });
}

const lineCases = [
  [6, "老陰", 0, 1, true],
  [7, "少陽", 1, 1, false],
  [8, "少陰", 0, 0, false],
  [9, "老陽", 1, 0, true],
];

lineCases.forEach(([value, name, bit, changedBit, moving]) => {
  const info = lineInfo(value);
  assert(info.name === name, `${value} name mismatch`);
  assert(info.bit === bit, `${value} primary bit mismatch`);
  assert(info.changedBit === changedBit, `${value} changed bit mismatch`);
  assert(info.moving === moving, `${value} moving mismatch`);
});

const testReadings = [
  { lines: [7, 7, 7, 7, 7, 7], primary: 1, changed: 1, moving: [] },
  { lines: [8, 8, 8, 8, 8, 8], primary: 2, changed: 2, moving: [] },
  { lines: [9, 9, 9, 9, 9, 9], primary: 1, changed: 2, moving: [1, 2, 3, 4, 5, 6] },
  { lines: [6, 6, 6, 6, 6, 6], primary: 2, changed: 1, moving: [1, 2, 3, 4, 5, 6] },
  { lines: [8, 7, 7, 7, 8, 7], primary: 50, changed: 50, moving: [] },
  { lines: [6, 7, 7, 9, 8, 7], primary: 50, changed: 26, moving: [1, 4] },
];

testReadings.forEach((test) => {
  const reading = readingFromLines(test.lines);
  assert(reading.primary.number === test.primary, `${test.lines.join(",")} primary mismatch`);
  assert(reading.changed.number === test.changed, `${test.lines.join(",")} changed mismatch`);
  assert(JSON.stringify(reading.moving) === JSON.stringify(test.moving), `${test.lines.join(",")} moving lines mismatch`);
});

console.log(JSON.stringify({
  oracleVerified: true,
  checked: {
    lineValues: lineCases.length,
    kingWenCells: 64,
    testReadings: testReadings.length,
  },
}, null, 2));
