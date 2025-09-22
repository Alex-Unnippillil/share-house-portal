"use client";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import React, { useTransition } from "react";

export function SignOut() {
        const [isPending, startTransition] = useTransition();
        const onSubmit = async () => {
                startTransition(async () => {
                        await signOut();
                });
        };

        return (
                <form action={onSubmit}>
                        <Button
                                className="flex w-full items-center gap-2"
                                variant="outline"
                        >
                                SignOut{" "}
                                <Icons.spinner
                                        className={cn(" animate-spin", { hidden: !isPending })}
                                />
                        </Button>
                </form>
        );
}