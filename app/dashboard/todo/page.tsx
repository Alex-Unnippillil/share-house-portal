"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";

import CreateForm from "./components/CreateForm";

export default function Todo() {
        const { notifications, clear } = useNotifications("maintenance");
        const todos = [
                {
                        title: "Subscribe",
                        created_by: "091832901830",
                        id: "101981908",
                        completed: false,
                },
        ];

        return (
                <div className="flex h-screen items-center justify-center">
                        <div className="w-96 space-y-5">
                                <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                                <span className="font-medium uppercase text-muted-foreground">Maintenance activity</span>
                                                <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2"
                                                        onClick={() => clear()}
                                                >
                                                        Clear
                                                </Button>
                                        </div>
                                        {notifications.length === 0 ? (
                                                <p className="mt-2">No recent ticket updates.</p>
                                        ) : (
                                                <ul className="mt-2 space-y-2">
                                                        {notifications.map((notification) => (
                                                                <li key={notification.id} className="rounded-md bg-background p-2 shadow-sm">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-semibold">{notification.title}</span>
                                                                                <Badge variant="outline">New</Badge>
                                                                        </div>
                                                                        <p className="mt-1 text-xs text-muted-foreground">{notification.body}</p>
                                                                </li>
                                                        ))}
                                                </ul>
                                        )}
                                </div>
                                <CreateForm />

                                {todos?.map((todo, index) => {
                                        return (
                                                <div key={index} className="flex items-center gap-6">
                                                        <h1
                                                                className={cn({
                                                                        "line-through": todo.completed,
                                                                })}
                                                        >
                                                                {todo.title}
                                                        </h1>

                                                        <Button>delete</Button>
                                                        <Button>Update</Button>
                                                </div>
                                        );
                                })}
                        </div>
                </div>
        );
}
