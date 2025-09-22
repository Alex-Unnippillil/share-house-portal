"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { Icon } from "@/components/icons";
export default function ToggleSidebar() {
	return (
		<Button
			variant="outline"
			className="block lg:hidden"
			onClick={() => document.getElementById("toggle-sidebar")?.click()}
		>
                        <Icon name="menu" aria-hidden />
		</Button>
	);
}