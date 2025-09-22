"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Layer, Rect, Stage, Text } from "react-konva";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLowPowerMode } from "@/hooks/use-low-power-mode";

const BASE_DIMENSIONS = {
        width: 720,
        height: 480,
};

type RoomOverlay = {
        id: string;
        label: string;
        occupant: string;
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
};

type StageConfig = {
        scale: number;
        x: number;
        y: number;
};

const OVERLAY_DATA: RoomOverlay[] = [
        {
                id: "avery-storage",
                label: "Avery — Storage Cabinet",
                occupant: "Avery (Room 2)",
                x: 440,
                y: 86,
                width: 180,
                height: 96,
                color: "rgba(79, 70, 229, 0.35)",
        },
        {
                id: "jordan-desk",
                label: "Jordan — Desk & Gear",
                occupant: "Jordan (Room 1)",
                x: 120,
                y: 260,
                width: 180,
                height: 110,
                color: "rgba(14, 165, 233, 0.28)",
        },
        {
                id: "shared-linen",
                label: "Shared Linen Closet",
                occupant: "Shared", 
                x: 320,
                y: 180,
                width: 120,
                height: 90,
                color: "rgba(16, 185, 129, 0.32)",
        },
        {
                id: "guest-supply",
                label: "Guest Bedding Bin",
                occupant: "Rotation: Week 2",
                x: 520,
                y: 300,
                width: 150,
                height: 110,
                color: "rgba(249, 115, 22, 0.32)",
        },
];

export default function FloorplanViewer() {
        const lowPowerMode = useLowPowerMode();
        const stageRef = useRef<Konva.Stage | null>(null);
        const baseLayerRef = useRef<Konva.Layer | null>(null);
        const overlayLayerRef = useRef<Konva.Layer | null>(null);
        const containerRef = useRef<HTMLDivElement | null>(null);

        const [dimensions, setDimensions] = useState(() => ({ ...BASE_DIMENSIONS }));
        const [hoveredOverlayId, setHoveredOverlayId] = useState<string | null>(null);
        const [stageConfig, setStageConfig] = useState<StageConfig>({ scale: 1, x: 0, y: 0 });
        const stageConfigRef = useRef(stageConfig);
        const rafRef = useRef<number | null>(null);

        const [visibleOverlays, setVisibleOverlays] = useState<Record<string, boolean>>(() => {
                return OVERLAY_DATA.reduce<Record<string, boolean>>((acc, overlay) => {
                        acc[overlay.id] = true;
                        return acc;
                }, {});
        });

        const activeOverlays = useMemo(() => {
                return OVERLAY_DATA.filter((overlay) => visibleOverlays[overlay.id]);
        }, [visibleOverlays]);

        const scheduleStageConfig = useCallback((next: StageConfig) => {
                stageConfigRef.current = next;

                if (typeof window === "undefined") {
                        setStageConfig(next);
                        return;
                }

                if (rafRef.current !== null) {
                        return;
                }

                rafRef.current = window.requestAnimationFrame(() => {
                        setStageConfig(stageConfigRef.current);
                        rafRef.current = null;
                });
        }, []);

        useEffect(() => {
                return () => {
                        if (rafRef.current !== null) {
                                window.cancelAnimationFrame(rafRef.current);
                        }
                };
        }, []);

        useEffect(() => {
                if (typeof window === "undefined" || !containerRef.current) {
                        return;
                }

                const element = containerRef.current;

                const updateSize = () => {
                        const width = element.clientWidth || BASE_DIMENSIONS.width;
                        const height = (width / BASE_DIMENSIONS.width) * BASE_DIMENSIONS.height;
                        setDimensions({ width, height });
                };

                updateSize();

                let resizeObserver: ResizeObserver | null = null;

                if (typeof ResizeObserver !== "undefined") {
                        resizeObserver = new ResizeObserver(() => updateSize());
                        resizeObserver.observe(element);
                } else {
                        window.addEventListener("resize", updateSize);
                }

                return () => {
                        if (resizeObserver) {
                                resizeObserver.disconnect();
                        } else {
                                window.removeEventListener("resize", updateSize);
                        }
                };
        }, []);

        useEffect(() => {
                if (!stageRef.current || typeof window === "undefined") {
                        return;
                }

                const container = stageRef.current.container();
                container.style.willChange = "transform";
                container.style.transform = "translateZ(0)";
                container.style.backfaceVisibility = "hidden";
                container.style.contain = "layout paint size";
                container.style.touchAction = "none";
        }, []);

        useEffect(() => {
                if (lowPowerMode) {
                        baseLayerRef.current?.clearCache();
                        overlayLayerRef.current?.clearCache();
                        return;
                }

                if (typeof window === "undefined") {
                        return;
                }

                const pixelRatio = window.devicePixelRatio ?? 1;

                window.requestAnimationFrame(() => {
                        baseLayerRef.current?.cache({ pixelRatio });
                        baseLayerRef.current?.batchDraw();
                        overlayLayerRef.current?.cache({ pixelRatio });
                        overlayLayerRef.current?.batchDraw();
                });
        }, [lowPowerMode, activeOverlays, dimensions.width, dimensions.height]);

        const handleWheel = useCallback(
                (event: KonvaEventObject<WheelEvent>) => {
                        event.evt.preventDefault();

                        const pointer = stageRef.current?.getPointerPosition();

                        if (!pointer) {
                                return;
                        }

                        const oldScale = stageConfigRef.current.scale;
                        const scaleBy = 1.04;
                        const direction = event.evt.deltaY > 0 ? 1 : -1;
                        let newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                        newScale = Math.min(Math.max(newScale, 0.6), 2.8);

                        const mousePointTo = {
                                x: (pointer.x - stageConfigRef.current.x) / oldScale,
                                y: (pointer.y - stageConfigRef.current.y) / oldScale,
                        };

                        const newPos = {
                                x: pointer.x - mousePointTo.x * newScale,
                                y: pointer.y - mousePointTo.y * newScale,
                        };

                        scheduleStageConfig({ scale: newScale, ...newPos });
                },
                [scheduleStageConfig],
        );

        const handleDragMove = useCallback(
                (event: KonvaEventObject<DragEvent>) => {
                        const stage = event.target as Konva.Stage;
                        scheduleStageConfig({ scale: stageConfigRef.current.scale, x: stage.x(), y: stage.y() });
                },
                [scheduleStageConfig],
        );

        const handleDragEnd = useCallback(() => {
                window.requestAnimationFrame(() => stageRef.current?.batchDraw());
        }, []);

        const toggleOverlay = useCallback((overlayId: string, nextValue: boolean) => {
                setVisibleOverlays((prev) => ({ ...prev, [overlayId]: nextValue }));
        }, []);

        const overlayLegend = useMemo(() => {
                return OVERLAY_DATA.map((overlay) => ({
                        id: overlay.id,
                        label: overlay.label,
                        occupant: overlay.occupant,
                        color: overlay.color,
                        active: !!visibleOverlays[overlay.id],
                }));
        }, [visibleOverlays]);

        const overlayKey = useMemo(() => activeOverlays.map((overlay) => overlay.id).join("|"), [activeOverlays]);

        useEffect(() => {
                if (overlayKey && !lowPowerMode) {
                        window.requestAnimationFrame(() => stageRef.current?.batchDraw());
                }
        }, [overlayKey, lowPowerMode]);

        const statusBadge = lowPowerMode ? "Low power fallback" : "GPU accelerated";

        return (
                <div className="space-y-6">
                        <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={lowPowerMode ? "secondary" : "outline"}>{statusBadge}</Badge>
                                <span className="text-sm text-muted-foreground">
                                        {lowPowerMode
                                                ? "Static overlay rendering keeps things smooth on reduced hardware."
                                                : "Konva canvas layers are cached for 60 fps pan & zoom."}
                                </span>
                        </div>

                        {lowPowerMode ? (
                                <FallbackFloorplan overlays={activeOverlays} />
                        ) : (
                                <div
                                        ref={containerRef}
                                        className="relative w-full overflow-hidden rounded-xl border bg-muted"
                                        style={{
                                                aspectRatio: `${BASE_DIMENSIONS.width} / ${BASE_DIMENSIONS.height}`,
                                                willChange: "transform",
                                                transform: "translateZ(0)",
                                                backfaceVisibility: "hidden",
                                        }}
                                >
                                        <Stage
                                                ref={stageRef}
                                                width={Math.max(1, Math.round(dimensions.width))}
                                                height={Math.max(1, Math.round(dimensions.height))}
                                                scaleX={stageConfig.scale}
                                                scaleY={stageConfig.scale}
                                                x={stageConfig.x}
                                                y={stageConfig.y}
                                                draggable
                                                onDragMove={handleDragMove}
                                                onDragEnd={handleDragEnd}
                                                onWheel={handleWheel}
                                                listening
                                                perfectDrawEnabled={false}
                                        >
                                                <Layer ref={baseLayerRef} listening={false}>
                                                        <Rect
                                                                x={40}
                                                                y={40}
                                                                width={BASE_DIMENSIONS.width - 80}
                                                                height={BASE_DIMENSIONS.height - 80}
                                                                cornerRadius={24}
                                                                fill="#F8FAFC"
                                                                stroke="#CBD5F5"
                                                                strokeWidth={2}
                                                        />
                                                        <Rect
                                                                x={40}
                                                                y={180}
                                                                width={BASE_DIMENSIONS.width - 80}
                                                                height={20}
                                                                fill="#E2E8F0"
                                                                opacity={0.7}
                                                        />
                                                        <Rect
                                                                x={BASE_DIMENSIONS.width / 2 - 20}
                                                                y={40}
                                                                width={40}
                                                                height={BASE_DIMENSIONS.height - 80}
                                                                fill="#E2E8F0"
                                                                opacity={0.7}
                                                        />
                                                        <Text
                                                                text="Entry"
                                                                x={BASE_DIMENSIONS.width / 2 - 28}
                                                                y={48}
                                                                fontSize={16}
                                                                fontStyle="bold"
                                                                fill="#334155"
                                                                rotation={-90}
                                                        />
                                                        <Text
                                                                text="Living"
                                                                x={60}
                                                                y={60}
                                                                fontSize={18}
                                                                fontStyle="bold"
                                                                fill="#334155"
                                                        />
                                                        <Text
                                                                text="Kitchen"
                                                                x={BASE_DIMENSIONS.width - 200}
                                                                y={60}
                                                                fontSize={18}
                                                                fontStyle="bold"
                                                                fill="#334155"
                                                        />
                                                </Layer>
                                                <Layer ref={overlayLayerRef}>
                                                        {activeOverlays.map((overlay) => (
                                                                <Group
                                                                        key={overlay.id}
                                                                        x={overlay.x}
                                                                        y={overlay.y}
                                                                        onMouseEnter={() => setHoveredOverlayId(overlay.id)}
                                                                        onMouseLeave={() => setHoveredOverlayId(null)}
                                                                >
                                                                        <Rect
                                                                                width={overlay.width}
                                                                                height={overlay.height}
                                                                                fill={overlay.color}
                                                                                cornerRadius={18}
                                                                                shadowBlur={hoveredOverlayId === overlay.id ? 24 : 12}
                                                                                shadowColor={overlay.color}
                                                                                shadowOpacity={0.25}
                                                                        />
                                                                        <Text
                                                                                text={`${overlay.label}\n${overlay.occupant}`}
                                                                                fontSize={14}
                                                                                fontStyle="bold"
                                                                                fill="#0f172a"
                                                                                width={overlay.width}
                                                                                padding={12}
                                                                                align="left"
                                                                                lineHeight={1.2}
                                                                        />
                                                                </Group>
                                                        ))}
                                                </Layer>
                                        </Stage>
                                </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {overlayLegend.map((overlay) => (
                                        <div
                                                key={overlay.id}
                                                className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm"
                                        >
                                                <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                                <span
                                                                        className="inline-block size-2.5 rounded-full"
                                                                        style={{ backgroundColor: overlay.color }}
                                                                />
                                                                <p className="text-sm font-medium leading-tight">{overlay.label}</p>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{overlay.occupant}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                        <Label htmlFor={`${overlay.id}-toggle`} className="sr-only">
                                                                Toggle {overlay.label}
                                                        </Label>
                                                        <Switch
                                                                id={`${overlay.id}-toggle`}
                                                                checked={overlay.active}
                                                                onCheckedChange={(value) => toggleOverlay(overlay.id, value)}
                                                        />
                                                </div>
                                        </div>
                                ))}
                        </div>
                </div>
        );
}

type FallbackFloorplanProps = {
        overlays: RoomOverlay[];
};

function FallbackFloorplan({ overlays }: FallbackFloorplanProps) {
        return (
                <div
                        className="relative w-full overflow-hidden rounded-xl border bg-muted"
                        style={{ aspectRatio: `${BASE_DIMENSIONS.width} / ${BASE_DIMENSIONS.height}` }}
                >
                        <div className="absolute inset-4 rounded-xl border border-dashed border-slate-300 bg-background" />
                        {overlays.map((overlay) => {
                                const left = (overlay.x / BASE_DIMENSIONS.width) * 100;
                                const top = (overlay.y / BASE_DIMENSIONS.height) * 100;
                                const width = (overlay.width / BASE_DIMENSIONS.width) * 100;
                                const height = (overlay.height / BASE_DIMENSIONS.height) * 100;

                                return (
                                        <div
                                                key={overlay.id}
                                                className="absolute rounded-lg border border-white/40 p-2 text-[0.7rem] font-semibold text-slate-800 shadow-sm"
                                                style={{
                                                        left: `${left}%`,
                                                        top: `${top}%`,
                                                        width: `${width}%`,
                                                        height: `${height}%`,
                                                        backgroundColor: overlay.color,
                                                }}
                                        >
                                                <div>{overlay.label}</div>
                                                <div className="text-[0.65rem] font-normal text-slate-700">{overlay.occupant}</div>
                                        </div>
                                );
                        })}
                </div>
        );
}
