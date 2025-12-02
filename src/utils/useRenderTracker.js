// utils/useRenderTracker.js
import { useEffect, useRef } from "react";

export function useRenderTracker(name = "Component") {
  const t = useRef(0);
  t.current = performance.now();
  useEffect(() => {
    const d = performance.now() - t.current;
    console.log(`🎬 render ${name} -> commit in`, d.toFixed(1), "ms");
  });
}