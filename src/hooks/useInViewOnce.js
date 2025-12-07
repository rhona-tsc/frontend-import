import { useEffect, useRef, useState } from "react";

/**
 * Small hook: returns [ref, inViewOnce]
 * Triggers true the first time the element enters the viewport, then stops observing.
 */
export default function useInViewOnce(options = { root: null, threshold: 0.2 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { root: options.root || null, threshold: options.threshold ?? 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [options.root, options.threshold, inView]);

  return [ref, inView];
}