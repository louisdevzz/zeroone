"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function AuthSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Skeleton */}
      <div className="w-64 border-r border-white/8 bg-background flex flex-col p-4">
        <Skeleton className="h-8 w-32 bg-white/10 mb-8" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
          <Skeleton className="h-10 w-full bg-white/10" />
        </div>
        <Skeleton className="h-12 w-full bg-white/10" />
      </div>
      {/* Main Content Skeleton */}
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-32 bg-white/10 mb-8" />
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-8 w-8 rounded-lg bg-white/10" />
              </div>
              <Skeleton className="h-8 w-16 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show skeleton while checking auth state
  if (!isLoaded || !isSignedIn) {
    return <AuthSkeleton />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Ambient background — matches landing page */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[300px] w-[400px] rounded-full bg-primary/4 blur-[100px]" />
      </div>
      <Sidebar />
      <main className="relative flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
