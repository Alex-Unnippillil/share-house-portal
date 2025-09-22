import React, { ReactNode } from "react";

export default function Table({
	children,
	headers,
}: {
	children: ReactNode;
	headers: string[];
}) {
	return (
		<div className="dark:bg-gradient-dark  w-full overflow-y-auto  rounded-md border border-zinc-200  dark:border-zinc-800">
			<div className="w-[900px] space-y-5 rounded-md bg-white py-5 dark:bg-inherit lg:w-full">
				<div className=" grid grid-cols-5 border-b px-5  py-2 pb-5 dark:border-zinc-600">
					{headers.map((header, index) => {
						return (
							<h1
								key={index}
								className="text-sm font-medium dark:text-gray-500"
							>
								{header}
							</h1>
						);
					})}
				</div>

				{children}
			</div>
		</div>
	);
}