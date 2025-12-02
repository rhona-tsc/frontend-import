// frontend/src/hooks/useRenderTracker.js
import { useEffect, useRef } from "react";

/**
 * Logs render/mount/unmount + an approximate "paint+settle" time (2× rAF).
 * Usage: useRenderTracker("ActItem", { actId, ...optionalMeta });
 */
export default function useRenderTracker(name = "Component", meta = {}) {
  const renders = useRef(0);
  const t0 = useRef(0);

  // Log every render
  renders.current += 1;
  console.debug(`📸 [${name}] render #${renders.current}`, meta);

  // Mount / unmount + post-paint timing
  useEffect(() => {
    t0.current =
      typeof performance?.now === "function" ? performance.now() : Date.now();
    console.debug(`🟢 [${name}] mount`, meta);

    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb) => setTimeout(cb, 0);

    // ~time-to-settle after paint (double rAF)
    raf(() =>
      raf(() => {
        const now =
          typeof performance?.now === "function"
            ? performance.now()
            : Date.now();
        const dur = (now - t0.current).toFixed(1);
        console.debug(`⏱️ [${name}] paint+settle ≈ ${dur}ms`);
      })
    );

    return () => {
      console.debug(`🔴 [${name}] unmount (rendered ${renders.current}×)`, meta);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}