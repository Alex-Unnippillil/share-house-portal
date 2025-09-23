import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingDashboard() {
  return (
    <div className="flex w-full">
      <Skeleton className="hidden h-screen w-72 rounded-none lg:block" />
      <div className="flex-1 space-y-6 bg-gray-100 p-5 sm:p-10 dark:bg-inherit">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
