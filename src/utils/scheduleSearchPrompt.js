// Only the automatic prompt is delayed; explicit Search clicks bypass this.
export function scheduleSearchPrompt({ window, onOpen, shouldOpen = () => true, delay = 5000, scrollDelay = 2000 }) {
  let scrollTimer;
  let finished = false;
  const startY = window.scrollY;
  const cleanup = () => {
    finished = true;
    window.clearTimeout(timer);
    window.clearTimeout(scrollTimer);
    window.removeEventListener('scroll', onScroll);
  };
  const open = () => {
    if (finished) return;
    if (!shouldOpen()) return;
    cleanup();
    onOpen();
  };
  const onScroll = () => {
    if (!scrollTimer && Math.abs(window.scrollY - startY) >= 40) {
      scrollTimer = window.setTimeout(open, scrollDelay);
    }
  };
  const timer = window.setTimeout(open, delay);
  window.addEventListener('scroll', onScroll, { passive: true });
  return cleanup;
}
