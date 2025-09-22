import { Suspense } from "react";
import dynamic from "next/dynamic";

const NavLinksClient = dynamic(() => import("./nav-links.client"), {
  ssr: false,
  suspense: true,
});

function NavLinksSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="h-8 animate-pulse rounded-sm bg-muted"
        />
      ))}
    </div>
  );
}

export default function NavLinks() {
  return (
    <Suspense fallback={<NavLinksSkeleton />}>
      <NavLinksClient />
    </Suspense>
  );
}
