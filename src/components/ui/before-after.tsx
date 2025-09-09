import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  alt: string;
  className?: string;
  grayscaleBefore?: boolean;
  initialX: number;
  eager?: boolean;
}

export const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  alt,
  className,
  grayscaleBefore = true,
  initialX,
  eager = false
}: BeforeAfterSliderProps) => {
  const [sliderPosition, setSliderPosition] = useState(initialX);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const cachedRect = useRef<DOMRect | null>(null);

  // tune these
  const STIFFNESS = 10;  // higher = snappier
  const DAMPING   = 5;  // higher = less bounce
  const EPS       = 0.05;

  // Cache the bounding rect to avoid forced reflows
  const updateCachedRect = useCallback(() => {
    if (containerRef.current) {
      cachedRect.current = containerRef.current.getBoundingClientRect();
    }
  }, []);

  // Update cached rect on mount and resize
  React.useEffect(() => {
    updateCachedRect();
    const handleResize = () => updateCachedRect();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCachedRect]);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    updateCachedRect(); // Update rect when dragging starts
  }, [updateCachedRect]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    paused.current = false; handleMouseUp();
  }, []);


  const handleMouseEnter = useCallback(() => {
    paused.current = true;
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !cachedRect.current) return;

    const x = e.clientX - cachedRect.current.left;
    const percentage = Math.max(0, Math.min(100, (x / cachedRect.current.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!cachedRect.current) return;

    const x = e.touches[0].clientX - cachedRect.current.left;
    const percentage = Math.max(0, Math.min(100, (x / cachedRect.current.width) * 100));
    setSliderPosition(percentage);
  }, []);

  // 1) Add these refs & config near your other refs/state
  const paused = useRef(false);          // paused on hover or user interaction

  React.useEffect(() => {
    let raf: number | null = null;
    let lastTs: number | null = null;
  
    // physics state in refs so re-renders don't reset motion
    const xRef = { current: sliderPosition };  // position in [0..100]
    const vRef = { current: 0 };               // velocity (units: %/s)
    const targetRef = { current: 100 as 0 | 100 };
    const dwellTimer = { current: 0 as unknown as number };
  
    const stopRAF = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };
  
    const setTarget = (t: 0 | 100) => {
      targetRef.current = t;
      // cancel any pending dwell if direction changes mid-wait
      if (dwellTimer.current) {
        clearTimeout(dwellTimer.current);
        dwellTimer.current = 0 as unknown as number;
      }
    };
  
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
  
      if (paused.current || isDragging.current) {
        lastTs = ts;
        return;
      }

      if (lastTs == null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05); // cap dt for stability
      lastTs = ts;

      // spring: a = k*(target - x) - c*v
      const x = xRef.current;
      const v = vRef.current;
      const target = targetRef.current;

      const a = STIFFNESS * (target - x) - DAMPING * v;
      const vNext = v + a * dt;
      let xNext = x + vNext * dt;

      // clamp & write
      if (xNext < 0) xNext = 0;
      if (xNext > 100) xNext = 100;

      xRef.current = xNext;
      vRef.current = vNext;

      // mirror to state for rendering
      setSliderPosition((prev) =>
        Math.abs(prev - xNext) > 0.05 ? xNext : prev
      );

      // target switching logic
      if (target === 100 && xNext >= 99.9 && Math.abs(vNext) < EPS) {
        setTarget(0); // bounce back immediately on the right
      }

      if (target === 0 && xNext <= 0.1 && Math.abs(vNext) < EPS) {
        // dwell 7s on the left before heading right again
        if (!dwellTimer.current) {
          dwellTimer.current = setTimeout(() => {
            setTarget(100);
          }, 7000) as unknown as number;
        }
      }
    };

    raf = requestAnimationFrame(loop);

    // pause when tab hidden
    const onVis = () => {
      if (document.hidden) stopRAF();
      else {
        lastTs = null;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopRAF();
      document.removeEventListener("visibilitychange", onVis);
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // no deps: runs once

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden cursor-col-resize select-none", className)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseEnter={handleMouseEnter}
    >
      {/* After Image (full) */}
      <img
        src={afterImage}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        width="502"
        height="502"
      />
      
      {/* Before Image (clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt={`${alt} (before)`}
          className={`w-full h-full object-cover ${grayscaleBefore ? 'filter grayscale' : ''}`}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          width="502"
          height="502"
        />
      </div>
      
      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={() => {
          isDragging.current = true;
          updateCachedRect();
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => isDragging.current = false}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-primary flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-primary"></div>
            <div className="w-0.5 h-4 bg-primary"></div>
          </div>
        </div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-2 py-1 rounded">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-black/70 text-white text-sm px-2 py-1 rounded">
        After
      </div>
    </div>
  );
};