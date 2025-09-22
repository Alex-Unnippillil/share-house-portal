"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button";
import {
        Form,
        FormControl,
        FormDescription,
        FormField,
        FormItem,
        FormLabel,
        FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { cn } from "@/lib/utils";
import { useTransition, useState } from "react";
import { submitInquiry } from '@/app/contact/actions'

const ContactSchema = z.object({
        name: z.string().min(1, { message: "Name can not be empty" }),
        email: z.string().email(),
        message: z.string().min(1, { message: "Message can not be empty" }),
});
type ContactValues = z.infer<typeof ContactSchema>
export function Contact() {
        const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState<boolean>(false)
const router = useRouter();
        const form = useForm<z.infer<typeof ContactSchema>>({
                resolver: zodResolver(ContactSchema),
                defaultValues: {
                        name: "",
                        email: "",
                        message: "",
                },
        });

        async function onSubmit(data: ContactValues) {
    setIsLoading(true)

    try {
      const result = await submitInquiry(data);

      if (result.success) {
        toast({
          title: "Message sent!",
          description: "Thank you for contacting us. We will respond within 24 hours.",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }



        return (

                        <Form {...form}>
                                <form
                                        onSubmit={form.handleSubmit(onSubmit)}
                                        className="w-full space-y-6 px-2"
                                >
<FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                        <FormItem>
                                                                <FormLabel>Name</FormLabel>
                                                                <FormControl>
                                                                        <Input placeholder="Satoshi Nakamoto" {...field} />
                                                                </FormControl>

                                                                <FormMessage />
                                                        </FormItem>
                                                )}
                                        />
                                             <FormField
                                                control={form.control}
                                                name="email"
                                                render={({ field }) => (
                                                        <FormItem>
                                                                <FormLabel>Email</FormLabel>
                                                                <FormControl>
                                                                        <Input placeholder="onyx@example.com" {...field} disabled={isLoading}/>
                                                                </FormControl>

                                                                <FormMessage />
                                                        </FormItem>
                                                )}
                                        />
                                        <FormField
                                                control={form.control}
                                                name="message"
                                                render={({ field }) => (
                                                        <FormItem>
                                                                <FormLabel>Message</FormLabel>
                                                                <FormControl>
                                                                        <Textarea
                                                                                placeholder="message"
                                                                                {...field}

                                                                        />
                                                                </FormControl>
                                                                <FormDescription>
                                                                        {
                                                                                "This is a form description."
                                                                        }
                                                                </FormDescription>
                                                                <FormMessage />
                                                        </FormItem>
                                                )}
                                        />
           <Button
            type="submit"
            disabled={isLoading}
                                className="flex w-1/2 items-center gap-2"
                                variant="outline"
                        >
                                Send Message
                                <Icon name="chevron-right" className="ml-2 size-4" />
   </Button>
                                </form>
                        </Form>
        );
        }