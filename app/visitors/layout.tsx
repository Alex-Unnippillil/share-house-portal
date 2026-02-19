import { AuthenticatedRouteLayout } from "@/components/layouts/authenticated-route-layout"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedRouteLayout>{children}</AuthenticatedRouteLayout>
}
