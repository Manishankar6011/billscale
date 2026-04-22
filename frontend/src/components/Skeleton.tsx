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

export const InventorySkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <Skeleton className="w-8 h-8 rounded-lg" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="pt-4 flex items-end justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <div className="space-y-1 text-right">
                        <Skeleton className="h-3 w-16 ml-auto" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                        <Skeleton className="h-3 w-16 ml-auto" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="h-14 bg-slate-50/50 flex items-center px-6 gap-4">
            {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-3 flex-1" />
            ))}
        </div>
        <div className="divide-y divide-slate-50">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 flex-1" />
                    <div className="flex-1 flex justify-end">
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const MetricsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-32" />
                </div>
            </div>
        ))}
    </div>
);


