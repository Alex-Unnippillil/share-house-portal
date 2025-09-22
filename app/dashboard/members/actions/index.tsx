"use server";

import { createSupbaseServerClient } from "@/utils/supaone";

import { redirect } from "next/navigation";

type formData = {
    email: string;
    password: string;
    confirm: string;
    username: string;
    role: string;
    status: string; 
}

export async function createMember() {}
export async function updateMemberById(id: string) {}
export async function deleteMemberById(id: string) {}
export async function readMembers() {}
