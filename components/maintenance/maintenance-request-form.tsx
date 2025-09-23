"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useMaintenanceMutation } from "@/hooks/mutations/use-maintenance-mutation";

const maintenanceRequestSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  category: z.string().optional(),
  location: z.string().optional(),
});

type MaintenanceRequestFormData = z.infer<typeof maintenanceRequestSchema>;

const categories = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Appliance",
  "Structural",
  "Pest Control",
  "Cleaning",
  "Security",
  "Other"
];

const priorities = [
  { value: "low", label: "Low - Nice to have" },
  { value: "normal", label: "Normal - Standard priority" },
  { value: "high", label: "High - Needs attention soon" },
  { value: "urgent", label: "Urgent - Emergency fix needed" },
];

export function MaintenanceRequestForm() {
  const { toast } = useToast();
  const maintenanceMutation = useMaintenanceMutation();

  const form = useForm<MaintenanceRequestFormData>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      category: "",
      location: "",
    },
  });

  const onSubmit = async (data: MaintenanceRequestFormData) => {
    try {
      const result = await maintenanceMutation.mutate({
        request: {
          title: data.title,
          description: data.description,
          priority: data.priority,
          category: data.category || null,
          location: data.location || null,
        },
      });

      if (result.status === "synced") {
        toast({
          title: "Maintenance request submitted",
          description: "Your maintenance request has been submitted and notifications sent.",
        });
        form.reset();
        return;
      }

      if (result.status === "queued") {
        toast({
          title: "Offline - request queued",
          description: "We'll submit your maintenance request once you're back online.",
        });
        form.reset();
        return;
      }

      if (result.status === "conflict") {
        toast({
          title: "Maintenance request already logged",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit maintenance request",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issue Title *</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the issue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detailed Description *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please provide detailed information about the issue, including when it started, what you've observed, and any steps you've taken..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority Level *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Kitchen, Bedroom 1, Common Area" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={maintenanceMutation.isMutating} className="w-full">
          {maintenanceMutation.isMutating ? "Submitting..." : "Submit Maintenance Request"}
        </Button>

        {maintenanceMutation.pendingCount > 0 && (
          <p className="text-sm text-muted-foreground" role="status">
            {maintenanceMutation.pendingCount} pending maintenance request
            {maintenanceMutation.pendingCount > 1 ? "s" : ""} will sync once you're back online.
          </p>
        )}
      </form>
    </Form>
  );
}
