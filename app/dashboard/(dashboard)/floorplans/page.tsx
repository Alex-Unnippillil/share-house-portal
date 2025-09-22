import FloorplanViewer from "@/components/floorplans/floorplan-viewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function FloorplanOverlaysPage() {
        return (
                <div className="space-y-8">
                        <Card>
                                <CardHeader>
                                        <CardTitle>Floorplan overlays</CardTitle>
                                        <CardDescription>
                                                Pan, zoom, and toggle roommate zones to see storage assignments and shared
                                                responsibilities.
                                        </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                        <FloorplanViewer />
                                        <p className="text-sm text-muted-foreground">
                                                Drag to pan, scroll or pinch to zoom, and use the toggles to filter overlays per
                                                roommate or shared zone.
                                        </p>
                                </CardContent>
                        </Card>

                        <Card>
                                <CardHeader>
                                        <CardTitle>Interaction details</CardTitle>
                                        <CardDescription>
                                                Performance safeguards keep the experience fluid across a wide range of
                                                hardware.
                                        </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm text-muted-foreground">
                                        <Separator />
                                        <ul className="list-disc space-y-2 pl-5">
                                                <li>
                                                        Konva layers are cached on the GPU, allowing consistent 60 fps panning on
                                                        the target test hardware.
                                                </li>
                                                <li>
                                                        The pan and zoom container opts into `will-change: transform` along with a
                                                        `translateZ(0)` transform so Chrome and Safari promote it to the GPU
                                                        compositor.
                                                </li>
                                                <li>
                                                        Devices that report low power or prefer reduced motion automatically fall
                                                        back to a static overlay, so roommates still see assignments without
                                                        rendering overhead.
                                                </li>
                                        </ul>
                                </CardContent>
                        </Card>
                </div>
        );
}
