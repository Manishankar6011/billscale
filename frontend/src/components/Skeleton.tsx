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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 bg-white/50">
                <Skeleton className="h-4 w-[100px] mb-4" />
                <Skeleton className="h-8 w-[150px]" />
            </div>
        ))}
    </div>
);
