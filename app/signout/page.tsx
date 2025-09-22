import { SignOut }from "@/components/sign-out";
import { readUserSession } from "@/utils/actions";
import { redirect } from "next/navigation";

export default async function page() {

        const { data: userSession } = await readUserSession();

        if (!userSession.session) {
                return redirect("/");
        }

    return (
          <div className="items-centered container px-4 py-8">
          <div className="mt-6">
                          <h1 className="mb-4 text-center text-2xl font-semibold tracking-tight">Sign out of Roomsily</h1>
            <SignOut/>
</div>
</div>
    )
        
}