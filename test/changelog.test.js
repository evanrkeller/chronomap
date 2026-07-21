import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

// Same extraction the org release/changelog-check workflows use.
const firstVersion = changelog.match(/^## \[(\d[^\]]*)\]/m)?.[1];

test('the changelog has a semver release section', () => {
  assert.ok(firstVersion, 'no ## [x.y.z] section found');
  assert.match(firstVersion, /^\d+\.\d+\.\d+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/);
});

test('package.json version matches the latest changelog release', () => {
  assert.equal(pkg.version, firstVersion);
});

test('an Unreleased section exists for accumulating work', () => {
  assert.match(changelog, /^## \[Unreleased\]/m);
});

test('comparison links cover Unreleased and the latest release', () => {
  assert.match(changelog, /^\[Unreleased\]: .+\/compare\/v\d/m);
  assert.ok(changelog.includes(`[${firstVersion}]: `), 'latest release link missing');
});
