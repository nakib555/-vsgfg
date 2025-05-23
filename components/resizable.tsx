// components\resizable.tsx
"use client"

import type React from "react"
import { useRef, useState, useEffect, useCallback, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResizableProps {
  children: ReactNode
  direction: "horizontal" | "vertical"
  initialSize?: string | number // Renamed from defaultSize for clarity
  minSize?: string | number
  maxSize?: string | number
  className?: string
  resizerClassName?: string // Allow custom resizer style
  resizerSide?: "left" | "right" | "top" | "bottom" // Clarify which edge has the resizer
  onResize?: (newSize: number) => void // Callback for when size changes
  onResizeEnd?: (finalSize: number) => void // Callback for when resizing finishes
}

export function Resizable({
  children,
  direction,
  initialSize: initialSizeProp = "auto",
  minSize: minSizeProp = 0, // Default to 0 if not provided
  maxSize: maxSizeProp = "auto",
  className,
  resizerClassName: customResizerClassName,
  resizerSide, // Determine this based on layout if not provided
  onResize,
  onResizeEnd,
}: ResizableProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const parentRef = useRef<HTMLDivElement | null>(null) // To get parent dimensions

  const [isResizing, setIsResizing] = useState(false)
  const [currentSize, setCurrentSize] = useState<number | "auto">("auto")

  // Determine the side of the resizer based on common layouts
  const actualResizerSide =
    resizerSide || (direction === "horizontal" ? "right" : "bottom")

  // Convert string sizes (px, %) to numbers
  const convertSizeToPixels = useCallback(
    (size: string | number | undefined, dimension: "width" | "height"): number | undefined => {
      if (typeof size === 'number') return size;
      if (typeof size === 'string') {
        if (size.endsWith('px')) return parseFloat(size);
        if (size.endsWith('%') && parentRef.current) {
          const parentVal = dimension === 'width' ? parentRef.current.clientWidth : parentRef.current.clientHeight;
          return (parseFloat(size) / 100) * parentVal;
        }
        if (size === "auto") return undefined; // Let flexbox handle it or use initial calc
        return parseFloat(size); // Assume pixels if no unit
      }
      return undefined;
    },
    []
  );

  useEffect(() => {
    if (panelRef.current) {
      parentRef.current = panelRef.current.parentElement as HTMLDivElement;
      if (initialSizeProp === "auto") {
        // If auto, let it be auto, or measure it if needed for specific logic
        setCurrentSize("auto");
      } else {
        const initialPx = convertSizeToPixels(initialSizeProp, direction === "horizontal" ? "width" : "height");
        if (initialPx !== undefined) {
          setCurrentSize(initialPx);
        }
      }
    }
  }, [initialSizeProp, direction, convertSizeToPixels]);


  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const startMousePos = direction === "horizontal" ? e.clientX : e.clientY
      const panelElement = panelRef.current
      if (!panelElement) return;

      const initialPanelSize = direction === "horizontal" ? panelElement.offsetWidth : panelElement.offsetHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!panelElement || !parentRef.current) return

        const currentMousePos = direction === "horizontal" ? moveEvent.clientX : moveEvent.clientY
        let delta = currentMousePos - startMousePos

        let newSizePx: number;

        if (direction === "horizontal") {
          newSizePx = actualResizerSide === "right" ? initialPanelSize + delta : initialPanelSize - delta;
        } else { // vertical
          newSizePx = actualResizerSide === "bottom" ? initialPanelSize + delta : initialPanelSize - delta;
        }

        const minPx = convertSizeToPixels(minSizeProp, direction === 'horizontal' ? 'width' : 'height') ?? 0;
        const maxPx = convertSizeToPixels(maxSizeProp, direction === 'horizontal' ? 'width' : 'height') ?? Infinity;

        newSizePx = Math.max(minPx, Math.min(newSizePx, maxPx));

        setCurrentSize(newSizePx)
        if (panelElement) {
            if (direction === "horizontal") {
                panelElement.style.width = `${newSizePx}px`;
                panelElement.style.flexBasis = `${newSizePx}px`; // Important for flex layouts
                panelElement.style.flexGrow = "0";
                panelElement.style.flexShrink = "0";
            } else {
                panelElement.style.height = `${newSizePx}px`;
                panelElement.style.flexBasis = `${newSizePx}px`;
                panelElement.style.flexGrow = "0";
                panelElement.style.flexShrink = "0";
            }
        }
        onResize?.(newSizePx)
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
        if (panelElement) {
            const finalSize = direction === "horizontal" ? panelElement.offsetWidth : panelElement.offsetHeight;
            onResizeEnd?.(finalSize);
        }
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [direction, minSizeProp, maxSizeProp, actualResizerSide, onResize, onResizeEnd, convertSizeToPixels]
  )

  const resizerBaseStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 10,
    userSelect: "none",
  }

  const resizerStyle: React.CSSProperties =
    direction === "horizontal"
      ? {
          ...resizerBaseStyle,
          top: 0,
          bottom: 0,
          width: "8px", // Increased hit area
          cursor: "col-resize",
          [actualResizerSide]: "-4px", // Center the 8px handle over the edge
        }
      : {
          ...resizerBaseStyle,
          left: 0,
          right: 0,
          height: "8px", // Increased hit area
          cursor: "row-resize",
          [actualResizerSide]: "-4px", // Center the 8px handle over the edge
        }

  const panelStyle: React.CSSProperties = {
    position: "relative", // Needed for absolute positioning of resizer
    overflow: "hidden", // Prevent content spill during resize
  };

  if (currentSize !== "auto") {
    if (direction === "horizontal") {
      panelStyle.width = `${currentSize}px`;
      panelStyle.flexBasis = `${currentSize}px`;
      panelStyle.flexGrow = 0;
      panelStyle.flexShrink = 0;
    } else {
      panelStyle.height = `${currentSize}px`;
      panelStyle.flexBasis = `${currentSize}px`;
      panelStyle.flexGrow = 0;
      panelStyle.flexShrink = 0;
    }
  } else {
     // If initial size is auto, let flexbox determine it.
     // Removed flexGrow: 1 to allow other flex items to grow.
    panelStyle.flexShrink = 1;
    if (direction === "horizontal") panelStyle.width = 'auto';
    else panelStyle.height = 'auto';
  }


  return (
    <div ref={panelRef} className={cn("resizable-panel", className)} style={panelStyle}>
      {children}
      <div
        className={cn(
          "resizer-handle bg-border/50 hover:bg-primary/50", // Basic visible styling
          isResizing && "bg-primary",
          customResizerClassName
        )}
        style={resizerStyle}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}