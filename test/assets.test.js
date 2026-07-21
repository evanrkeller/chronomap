import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

// Reads width/height from a baseline or progressive JPEG's SOF marker.
function jpegDimensions(path) {
  const buf = readFileSync(path);
  assert.equal(buf.readUInt16BE(0), 0xffd8, `${path} is not a JPEG`);
  let offset = 2;
  while (offset < buf.length - 9) {
    assert.equal(buf[offset], 0xff, `bad marker in ${path}`);
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  assert.fail(`no SOF marker found in ${path}`);
}

for (const name of ['earth-day.jpg', 'earth-night.jpg']) {
  const path = new URL(`../assets/${name}`, import.meta.url).pathname;

  test(`${name} is a 2048x1024 JPEG`, () => {
    const { width, height } = jpegDimensions(path);
    assert.equal(width, 2048);
    assert.equal(height, 1024);
  });

  test(`${name} is at most 1 MB`, () => {
    assert.ok(statSync(path).size <= 1024 * 1024, `${name} exceeds 1 MB`);
  });
}
