"use client";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React, { useTransition } from "react";
import { Icon } from "@/components/icons";

export default function SignOut() {
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
                                <Icon
                                        name="spinner"
                                        className={cn("animate-spin", { hidden: !isPending })}
                                        aria-hidden
                                />
			</Button>
		</form>
	);
}