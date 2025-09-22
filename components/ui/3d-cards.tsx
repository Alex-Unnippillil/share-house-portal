"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createContext, useContextSelector } from "use-context-selector";

import { cn } from "@/lib/utils";

const MouseEnterContext = createContext<boolean | undefined>(undefined);

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 25;
    const y = (e.clientY - top - height / 2) / 25;
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
  };

  const handleMouseEnter = () => {
    setIsMouseEntered(true);
    if (!containerRef.current) return;
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = `rotateY(0deg) rotateX(0deg)`;
  };
  return (
    <MouseEnterContext.Provider value={isMouseEntered}>
      <div
        className={cn(
          "flex items-center justify-center py-20",
          containerClassName,
        )}
        style={{
          perspective: "1000px",
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative flex items-center justify-center transition-all duration-200 ease-linear",
            className,
          )}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "size-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isMouseEntered = useMouseEnter();

  const translateWithUnit = useCallback((value: number | string) => {
    return typeof value === "number" ? `${value}px` : value;
  }, []);

  const rotateWithUnit = useCallback((value: number | string) => {
    return typeof value === "number" ? `${value}deg` : value;
  }, []);

  const handleAnimations = useCallback(() => {
    if (!ref.current) return;

    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateWithUnit(
        translateX,
      )}) translateY(${translateWithUnit(translateY)}) translateZ(${translateWithUnit(
        translateZ,
      )}) rotateX(${rotateWithUnit(rotateX)}) rotateY(${rotateWithUnit(
        rotateY,
      )}) rotateZ(${rotateWithUnit(rotateZ)})`;
      return;
    }

    ref.current.style.transform =
      "translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
  }, [
    isMouseEntered,
    rotateWithUnit,
    rotateX,
    rotateY,
    rotateZ,
    translateWithUnit,
    translateX,
    translateY,
    translateZ,
  ]);

  useEffect(() => {
    handleAnimations();
  }, [handleAnimations]);

  return (
    <Tag
      ref={ref}
      className={cn("w-fit transition duration-200 ease-linear", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Create a hook to use the context
export const useMouseEnter = () => {
  const isMouseEntered = useContextSelector(
    MouseEnterContext,
    value => value,
  );
  if (isMouseEntered === undefined) {
    throw new Error("useMouseEnter must be used within a MouseEnterProvider");
  }
  return isMouseEntered;
};
