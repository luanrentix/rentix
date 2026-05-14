"use client";

import { ReactNode } from "react";
import { PrivateRoute } from "@/components/PrivateRoute";

type AuthGuardProps = {
  children: ReactNode;
};

export default function AuthGuard({ children }: AuthGuardProps) {
  return <PrivateRoute>{children}</PrivateRoute>;
}