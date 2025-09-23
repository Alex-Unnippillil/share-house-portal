"use server";

import { headers } from "next/headers";
import { createSupbaseServerClient } from "@/utils/supaone";

import { redirect } from "next/navigation";
import { getLogger, withRequestContext } from "@/lib/logger";

type formData = {
    email: string;
    password: string;
    confirm: string;
    username: string;
    role: string;
    status: string; 
}

const log = getLogger({ module: "dashboard.members.actions" });

export async function createMember() {
  const requestHeaders = headers();
  return withRequestContext(
    async () => {
      log.info("createMember invoked");
    },
    { headers: requestHeaders }
  );
}
export async function updateMemberById(id: string) {
  const requestHeaders = headers();
  return withRequestContext(
    async () => {
      log.info({ id }, "updateMemberById invoked");
    },
    { headers: requestHeaders }
  );
}
export async function deleteMemberById(id: string) {
  const requestHeaders = headers();
  return withRequestContext(
    async () => {
      log.info({ id }, "deleteMemberById invoked");
    },
    { headers: requestHeaders }
  );
}
export async function readMembers() {
  const requestHeaders = headers();
  return withRequestContext(
    async () => {
      log.info("readMembers invoked");
    },
    { headers: requestHeaders }
  );
}
