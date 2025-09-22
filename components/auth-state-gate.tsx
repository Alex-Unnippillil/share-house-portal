"use client";

import { useEffect } from "react";

import { createClient } from "@/utils/supabase-browser";

interface AuthStateGateProps {
  initialIsAuthenticated: boolean;
}

export function AuthStateGate({ initialIsAuthenticated }: AuthStateGateProps) {
  useEffect(() => {
    const body = document.body;

    body.dataset.authReady = "true";
    body.dataset.authenticated = initialIsAuthenticated ? "true" : "false";

    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      body.dataset.authenticated = session ? "true" : "false";
    });

    return () => {
      body.dataset.authReady = "false";
      data?.subscription.unsubscribe();
    };
  }, [initialIsAuthenticated]);

  return null;
}
