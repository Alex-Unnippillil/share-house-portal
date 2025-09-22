import AboutPageContent from "./about-page-content"
import { REVALIDATION_WINDOWS } from "@/config/cache"

export const dynamic = "force-static"
export const revalidate = REVALIDATION_WINDOWS.MARKETING

export default function AboutPage() {
  return <AboutPageContent />
}
