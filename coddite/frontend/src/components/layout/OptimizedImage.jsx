import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function OptimizedImage({ src, alt, className, fallback = null, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return fallback || (
      <div className={twMerge(clsx("bg-gray-200 dark:bg-white/5 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400", className))}>
        No Image
      </div>
    );
  }

  return (
    <div className={twMerge(clsx("relative overflow-hidden bg-gray-200 dark:bg-white/5", className))}>
      {/* Blurred Skeleton */}
      <div 
        className={clsx(
          "absolute inset-0 transition-opacity duration-500 bg-gray-200 dark:bg-white/10 animate-pulse",
          isLoaded ? "opacity-0" : "opacity-100"
        )} 
      />
      
      {/* Actual Image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={clsx(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
}
