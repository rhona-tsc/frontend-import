import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleSearchPrompt } from './scheduleSearchPrompt.js';

function browser() {
  let time = 0, sequence = 0;
  const timers = new Map(), listeners = new Map();
  const window = {
    scrollY: 0,
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
  };
  return {
    window,
    advance(ms) {
      time += ms;
      for (const [id, timer] of [...timers]) if (timer.due <= time && timers.has(id)) { timers.delete(id); timer.callback(); }
    },
    scroll(y) { window.scrollY = y; listeners.get('scroll')?.(); },
  };
}

test('automatic search waits five seconds and opens only once', () => {
  const env = browser(); let opened = 0;
  scheduleSearchPrompt({ window: env.window, onOpen: () => opened++ });
  env.advance(4999); assert.equal(opened, 0);
  env.advance(1); assert.equal(opened, 1);
  env.scroll(100); env.advance(5000); assert.equal(opened, 1);
});

test('scrolling starts a two-second prompt, without resetting on every scroll', () => {
  const env = browser(); let opened = 0;
  scheduleSearchPrompt({ window: env.window, onOpen: () => opened++ });
  env.advance(500); env.scroll(100);
  env.advance(1500); env.scroll(200); assert.equal(opened, 0);
  env.advance(500); assert.equal(opened, 1);
  env.advance(10000); assert.equal(opened, 1);
});

test('leaving the page or manually opening search cancels the pending prompt', () => {
  const env = browser(); let opened = 0;
  const cancel = scheduleSearchPrompt({ window: env.window, onOpen: () => opened++ });
  env.scroll(100); cancel(); env.advance(10000); assert.equal(opened, 0);
});

test('rechecks eligibility before opening after a delay', () => {
  const env = browser(); let opened = 0, eligible = true;
  scheduleSearchPrompt({ window: env.window, shouldOpen: () => eligible, onOpen: () => opened++ });
  eligible = false;
  env.advance(5000); assert.equal(opened, 0);
});
