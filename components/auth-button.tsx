import { readUserSession } from "@/utils/actions"

import { SignOut } from "./sign-out"

export default async function AuthButton() {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return null
  }

  return <SignOut />
}
