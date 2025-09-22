import { SideBar } from "@/app/dashboard/components/SideNav"
import MemberTable from "@/app/dashboard/members/components/MemberTable"
import TodoTable from "@/app/dashboard/todo/components/TodoTable"
import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import { loadPerfDashboardFixture } from "@/lib/perf/load-dashboard-fixture"

export const dynamic = "force-static"

export default async function PerfTestPage() {
  const fixture = await loadPerfDashboardFixture()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 lg:flex-row lg:px-8">
      <aside className="lg:w-80">
        <SideBar className="hidden lg:block rounded-xl border bg-background shadow-sm" />
      </aside>
      <main className="flex-1 space-y-8">
        <DashboardOverview data={fixture.overview} />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Household members</h3>
              <span className="text-sm text-muted-foreground">{fixture.members.length} total</span>
            </div>
            <MemberTable members={fixture.members} />
          </div>

          <div className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Shared to-dos</h3>
              <span className="text-sm text-muted-foreground">{fixture.todos.length} tasks</span>
            </div>
            <TodoTable todos={fixture.todos} />
          </div>
        </section>
      </main>
    </div>
  )
}
