import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router";
import { hasSession } from "./session";

export function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();

  if (!hasSession()) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return children;
}
