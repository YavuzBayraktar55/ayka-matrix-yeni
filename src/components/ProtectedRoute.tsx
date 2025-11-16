'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Loader from '@/components/Loader';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Sadece loading bittiyse ve user yoksa yönlendir
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Role kontrolü - loading bittiyse ve user varsa
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.PersonelRole)) {
      router.push('/dashboard');
    }
  }, [user, loading, router, allowedRoles]);

  // Loading durumunda loader göster
  if (loading) {
    return (
      <div className="min-h-screen bg-[#2a2a2a] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // User yoksa null döndür (useEffect zaten yönlendirme yapacak)
  if (!user) {
    return null;
  }

  // Role kontrolü
  if (allowedRoles && !allowedRoles.includes(user.PersonelRole)) {
    return null;
  }

  return <>{children}</>;
}
