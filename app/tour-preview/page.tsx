import FirstRunTour from "@/components/onboarding/FirstRunTour";
import TourPreviewScaffold from "./TourPreviewScaffold";

export const metadata = {
        title: "Dashboard tour preview",
};

export default function TourPreviewPage() {
        return (
                <FirstRunTour initialHasSeenTour={false}>
                        <TourPreviewScaffold />
                </FirstRunTour>
        );
}
