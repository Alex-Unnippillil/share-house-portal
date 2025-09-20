import React from "react";
import { AuthFormLegacy } from '@/app/auth-server-action/components/AuthFormLegacy'

export default function page() {
	return (
		<div className="flex h-screen items-center justify-center">
			<div className="w-96">
				<AuthFormLegacy />
			</div>
		</div>
	);
}
