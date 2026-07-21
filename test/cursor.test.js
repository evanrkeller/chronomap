import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { CURSOR_IDLE_MS, initCursorAutoHide } from '../js/cursor.js';

function fakeElement() {
  const classes = new Set();
  const listeners = new Map();
  return {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    addEventListener: (type, handler) => listeners.set(type, handler),
    fire: (type) => listeners.get(type)?.(),
    isIdle: () => classes.has('cursor-idle'),
  };
}

test('the display starts with the cursor hidden', () => {
  const element = fakeElement();
  initCursorAutoHide(element);
  assert.equal(element.isIdle(), true);
});

test('mouse movement shows the cursor', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const element = fakeElement();
    initCursorAutoHide(element);
    element.fire('mousemove');
    assert.equal(element.isIdle(), false);
  } finally {
    mock.timers.reset();
  }
});

test('the cursor hides again after the idle delay', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const element = fakeElement();
    initCursorAutoHide(element);
    element.fire('mousemove');
    mock.timers.tick(CURSOR_IDLE_MS - 1);
    assert.equal(element.isIdle(), false, 'still visible just before the delay');
    mock.timers.tick(1);
    assert.equal(element.isIdle(), true, 'hidden after the delay');
  } finally {
    mock.timers.reset();
  }
});

test('continuous movement keeps re-arming the timer', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const element = fakeElement();
    initCursorAutoHide(element);
    for (let i = 0; i < 5; i += 1) {
      element.fire('mousemove');
      mock.timers.tick(CURSOR_IDLE_MS - 100);
      assert.equal(element.isIdle(), false, `visible through burst ${i}`);
    }
    mock.timers.tick(CURSOR_IDLE_MS);
    assert.equal(element.isIdle(), true, 'hidden once movement stops');
  } finally {
    mock.timers.reset();
  }
});
