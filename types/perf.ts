import type { ButtonProps } from "@/components/ui/button"

export type ButtonVariant = NonNullable<ButtonProps["variant"]>

export interface DashboardHeroAction {
  label: string
  href: string
  variant?: ButtonVariant
}

export interface DashboardHeroSection {
  greeting: string
  actions: DashboardHeroAction[]
}

export interface DashboardRentCard {
  title: string
  label: string
  amount: string
  due: string
  cta: DashboardHeroAction
}

export interface DashboardListCard {
  title: string
  items: string[]
  cta: DashboardHeroAction
}

export interface DashboardOverviewData {
  hero: DashboardHeroSection
  rentCard: DashboardRentCard
  documentsCard: DashboardListCard
  roommateBoard: DashboardListCard
}

export interface DashboardMemberRecord {
  name: string
  role: string
  created_at: string
  status: string
}

export interface DashboardTodoRecord {
  title: string
  status: string
  created_at: string
  create_by: string
}

export interface PerfDashboardFixture {
  overview: DashboardOverviewData
  members: DashboardMemberRecord[]
  todos: DashboardTodoRecord[]
}
