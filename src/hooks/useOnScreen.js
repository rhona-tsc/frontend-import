// src/hooks/useOnScreen.js
import { useEffect, useRef, useState } from "react";

/**
 * Flexible IntersectionObserver hook.
 * Usage A: const [ref, onScreen] = useOnScreen({ rootMargin: "200px" });
 * Usage B: const onScreen = useOnScreen(ref, { threshold: 0.25 });
 */
export default function useOnScreen(refOrOptions, maybeOptions) {
  const hasRefArg =
    refOrOptions &&
    typeof refOrOptions === "object" &&
    "current" in refOrOptions;

  const ref = hasRefArg ? refOrOptions : useRef(null);
  const options = hasRefArg ? (maybeOptions || {}) : (refOrOptions || {});

  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref?.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIntersecting(Boolean(entry?.isIntersecting)),
      options
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ref,
    options.root || null,
    options.rootMargin || "",
    Array.isArray(options.threshold)
      ? options.threshold.join(",")
      : options.threshold ?? 0,
  ]);

  return hasRefArg ? isIntersecting : [ref, isIntersecting];
}