import type { Metadata } from "next";

import CreateSupplyItemForm from "./components/create-supply-item-form";
import SupplyCatalogTable from "./components/supply-catalog-table";
import { createSupbaseServerClient } from "@/utils/supaone";
import type { SupplyItem } from "@/types/supplies";

export const metadata: Metadata = {
        title: "Supply catalog",
};

export default async function SupplyCatalogPage() {
        const supabase = await createSupbaseServerClient();
        const { data, error } = await supabase
                .from("supply_items")
                .select("*")
                .order("name", { ascending: true });

        if (error) {
                console.error("Failed to load supply catalog", error);
        }

        const items: SupplyItem[] = data ?? [];

        return (
                <div className="space-y-8">
                        <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tight">Supply catalog</h1>
                                <p className="text-muted-foreground">
                                        Configure the default units, quantities, and roommate split behavior for shared supplies.
                                </p>
                        </div>
                        <CreateSupplyItemForm />
                        <SupplyCatalogTable items={items} />
                </div>
        );
}
