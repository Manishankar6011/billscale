import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1, ...props }) => {
    return (
        <>
            {[...Array(count)].map((_, i) => (
                <div
                    key={i}
                    className={cn("animate-pulse rounded-md bg-slate-200/60", className)}
                    {...props}
                />
            ))}
        </>
    );
};

export default Skeleton;

export const CardSkeleton = () => (
    <div className="card p-6 bg-white/50 animate-pulse">
        <div className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
            </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-[80%]" />
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 p-6 rounded-[2.5rem] border border-white/40">
            <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-3xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <Skeleton className="h-12 w-64 rounded-2xl" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="p-8 rounded-[2.5rem] bg-white border border-slate-100 h-56 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <Skeleton className="w-14 h-14 rounded-2xl" />
                        <Skeleton className="w-16 h-6 rounded-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

