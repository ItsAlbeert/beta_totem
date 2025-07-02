
"use client";

import { usePathname } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Toaster } from '@/components/ui/toaster';

export function AppLayoutController({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}
