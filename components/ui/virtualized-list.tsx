'use client';

import {
  type AriaRole,
  type HTMLAttributes,
  type Key,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';

export interface VirtualizedListProps<T> {
  items: T[];
  children: (context: { item: T; index: number }) => ReactNode;
  estimateSize: (item: T, index: number) => number;
  getKey?: (item: T, index: number) => Key;
  overscan?: number;
  virtualizationThreshold?: number;
  role?: AriaRole;
  itemRole?: AriaRole;
  parentProps?: HTMLAttributes<HTMLDivElement>;
  fallbackParentProps?: HTMLAttributes<HTMLDivElement>;
  itemClassName?: string;
  useWindowScroll?: boolean;
}

const DEFAULT_THRESHOLD = 1;

export function VirtualizedList<T>({
  items,
  children,
  estimateSize,
  getKey,
  overscan = 8,
  virtualizationThreshold = DEFAULT_THRESHOLD,
  role = 'list',
  itemRole = 'listitem',
  parentProps,
  fallbackParentProps,
  itemClassName,
  useWindowScroll = false,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const windowContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    handleChange(motionQuery);

    const listener = (event: MediaQueryListEvent) => handleChange(event);
    if ('addEventListener' in motionQuery) {
      motionQuery.addEventListener('change', listener);
    } else {
      // Safari < 14 fallback
      motionQuery.addListener(listener);
    }

    return () => {
      if ('removeEventListener' in motionQuery) {
        motionQuery.removeEventListener('change', listener);
      } else {
        motionQuery.removeListener(listener);
      }
    };
  }, [isClient]);

  useLayoutEffect(() => {
    if (!isClient || !useWindowScroll) {
      return;
    }

    const updateScrollMargin = () => {
      if (!windowContainerRef.current) {
        return;
      }

      const rect = windowContainerRef.current.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };

    updateScrollMargin();
    window.addEventListener('resize', updateScrollMargin);

    return () => {
      window.removeEventListener('resize', updateScrollMargin);
    };
  }, [isClient, useWindowScroll, items.length]);

  const shouldVirtualize = isClient && !prefersReducedMotion && items.length >= virtualizationThreshold;

  const { className: parentClassName, ...restParentProps } = parentProps ?? {};
  const { className: fallbackClassName, ...restFallbackProps } = fallbackParentProps ?? {};

  const getScrollElement = useCallback(
    () => (useWindowScroll ? window : parentRef.current),
    [useWindowScroll],
  );

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement,
    estimateSize: index => {
      const item = items[index];
      return item ? estimateSize(item, index) : 0;
    },
    overscan,
    scrollMargin: useWindowScroll ? scrollMargin : undefined,
    getItemKey: getKey
      ? index => {
          const item = items[index];
          return item ? getKey(item, index) : index;
        }
      : undefined,
  });

  if (!shouldVirtualize) {
    return (
      <div
        {...restFallbackProps}
        role={role}
        className={cn(parentClassName, fallbackClassName)}
      >
        {items.map((item, index) => (
          <div
            key={getKey ? getKey(item, index) : index}
            role={itemRole}
            className={itemClassName}
          >
            {children({ item, index })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      {...restParentProps}
      ref={useWindowScroll ? windowContainerRef : parentRef}
      role={role}
      className={cn('relative w-full', parentClassName)}
      aria-live="off"
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => {
          const item = items[virtualItem.index];
          if (!item) {
            return null;
          }

          return (
            <div
              key={getKey ? getKey(item, virtualItem.index) : virtualItem.key}
              data-index={virtualItem.index}
              role={itemRole}
              className={cn('absolute left-0 w-full', itemClassName)}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
                top: 0,
              }}
              ref={node => {
                if (node) {
                  virtualizer.measureElement(node);
                }
              }}
            >
              {children({ item, index: virtualItem.index })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
