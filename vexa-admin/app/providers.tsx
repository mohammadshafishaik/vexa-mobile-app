'use client';

import { AdminAuthProvider } from '@/components/admin/AdminAuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
