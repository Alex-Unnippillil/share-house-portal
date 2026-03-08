import { MemberTableSkeleton } from "./components/skeletons"
import { MembersScrollContainer } from "./components/MembersScrollContainer"

export default function LoadingMembers() {
        return (
                <MembersScrollContainer className="w-full space-y-5 overflow-y-auto px-3">
                        <div className="h-10 w-40 animate-pulse rounded bg-muted/60" />
                        <MemberTableSkeleton />
                </MembersScrollContainer>
        )
}
