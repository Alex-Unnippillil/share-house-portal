"use client";

import React, { useEffect, useState } from "react";
import SmartLink from "@/components/navigation/SmartLink";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase-browser";
import { fetchMemberRole } from "@/lib/data/members";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import {
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  MessageSquare,
  ShoppingCart,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { resolveMemberPersona, type MemberPersona } from "@/lib/members";

type NavigationEntry = {
  href: string;
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const MANAGEMENT_LINKS: NavigationEntry[] = [
  { href: "/dashboard", text: "Overview", Icon: Home },
  { href: "/dashboard/members", text: "Residents", Icon: Users },
  { href: "/payments", text: "Payments", Icon: CreditCard },
  { href: "/documents", text: "Documents", Icon: FileText },
  { href: "/messaging", text: "Message Board", Icon: MessageSquare },
  { href: "/bookings", text: "Amenity Bookings", Icon: Calendar },
  { href: "/visitors", text: "Visitor Log", Icon: UserCheck },
  { href: "/maintenance", text: "Maintenance", Icon: Wrench },
];

const RESIDENT_LINKS: NavigationEntry[] = [
  { href: "/dashboard", text: "Overview", Icon: Home },
  { href: "/payments", text: "Payments", Icon: CreditCard },
  { href: "/documents", text: "My Lease", Icon: FileText },
  { href: "/messaging", text: "Message Board", Icon: MessageSquare },
  { href: "/bookings", text: "Book Amenities", Icon: Calendar },
  { href: "/visitors", text: "Visitors", Icon: UserCheck },
  { href: "/maintenance", text: "Maintenance", Icon: Wrench },
  { href: "/chores", text: "Chores", Icon: ClipboardList },
  { href: "/supplies", text: "Supplies", Icon: ShoppingCart },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [persona, setPersona] = useState<MemberPersona>('unknown');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setPersona('unknown');
          return;
        }

        const typedSupabase = supabase as unknown as TypedSupabaseClient;

        try {
          const resolvedRole = await fetchMemberRole(typedSupabase, user.id);
          setPersona(resolveMemberPersona(resolvedRole));
        } catch (memberError) {
          console.error('Error loading member role', memberError);
          setPersona('unknown');
        }
      } catch (error) {
        setPersona('unknown');
      }
    };

    load();
  }, []);

  const effectivePersona = persona === 'unknown' ? 'resident' : persona;
  const links = effectivePersona === 'management' ? MANAGEMENT_LINKS : RESIDENT_LINKS;

  return (
    <div className="space-y-5">
      {links.map((link) => {
        const Icon = link.Icon;
        const isActive = pathname === link.href;

        return (
          <SmartLink
            onClick={() => document.getElementById('sidebar-close')?.click()}
            href={link.href}
            key={link.href}
            className={cn(
              'flex items-center gap-2 rounded-sm p-2 transition-colors hover:bg-muted',
              {
                'bg-gray-500 text-white dark:bg-gray-700': isActive,
              },
            )}
            intent="navigation"
          >
            <Icon className="size-4" />
            {link.text}
          </SmartLink>
        );
      })}
    </div>
  );
}