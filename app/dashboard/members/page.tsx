import { searchMembers } from "@/lib/data/members"
import CreateMember from "./components/create/CreateMember"
import MemberTable from "./components/MemberTable"
import SearchMembers from "./components/SearchMembers"

interface MembersPageProps {
  searchParams?: {
    q?: string | string[]
  }
}

export default async function Members({ searchParams }: MembersPageProps = {}) {
  const queryParam = searchParams?.q
  const searchQuery = Array.isArray(queryParam) ? queryParam[0] : queryParam
  const members = await searchMembers(searchQuery)

  return (
    <div className="w-full space-y-5 overflow-y-auto px-3">
      <h1 className="text-3xl font-bold">Members</h1>
      <div className="flex gap-2">
        <SearchMembers />
        <CreateMember />
      </div>
      <MemberTable members={members} searchQuery={searchQuery} />
    </div>
  )
}
