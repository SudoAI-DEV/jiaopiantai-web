"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseImageZoomOptions {
  minScale?: number;
  maxScale?: number;
  scaleStep?: number;
}

export function useImageZoom({
  minScale = 0.5,
  maxScale = 5,
  scaleStep = 0.25,
}: UseImageZoomOptions = {}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const clampScale = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale]
  );

  const reset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomTo = useCallback(
    (newScale: number) => {
      const clamped = clampScale(newScale);
      if (clamped === 1) {
        setPosition({ x: 0, y: 0 });
      }
      setScale(clamped);
    },
    [clampScale]
  );

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s + scaleStep));
  }, [clampScale, scaleStep]);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = clampScale(s - scaleStep);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, [clampScale, scaleStep]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
      setScale((s) => {
        const next = clampScale(s + delta);
        if (next === 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    },
    [clampScale, scaleStep]
  );

  const handleDoubleClick = useCallback(() => {
    if (scale !== 1) {
      reset();
    } else {
      setScale(2);
    }
  }, [scale, reset]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      positionStart.current = { ...position };
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: positionStart.current.x + dx,
        y: positionStart.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const style: React.CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
    transformOrigin: "center center",
    cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
    transition: isDragging ? "none" : "transform 0.2s ease-out",
  };

  return {
    scale,
    position,
    isDragging,
    containerRef,
    style,
    reset,
    zoomTo,
    zoomIn,
    zoomOut,
    handleWheel,
    handleDoubleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
