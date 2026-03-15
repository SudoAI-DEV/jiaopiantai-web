"use client";

import { useState } from "react";

interface OptimizedImageProps {
  src?: string;
  alt?: string;
  aspectRatio?: "square" | "3/4" | "4/3" | "16/9" | "auto";
  showSkeleton?: boolean;
  fallbackSrc?: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

const aspectRatioClasses = {
  square: "aspect-square",
  "3/4": "aspect-[3/4]",
  "4/3": "aspect-[4/3]",
  "16/9": "aspect-video",
  auto: "aspect-auto",
};

export function OptimizedImage({
  src,
  alt = "",
  aspectRatio = "auto",
  showSkeleton = true,
  className = "",
  fill = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${
        fill ? "" : aspectRatioClasses[aspectRatio]
      } ${className}`}
    >
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}
      
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm">加载失败</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}

export function GridImage({
  src,
  alt = "",
  className = "",
}: Omit<OptimizedImageProps, "aspectRatio">) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gray-100 rounded-lg ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm">加载失败</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}

export function ThumbnailImage({
  src,
  alt = "",
  className = "",
}: Omit<OptimizedImageProps, "aspectRatio" | "fill">) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gray-100 rounded ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gray-200" />
      )}

      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400 text-sm">!</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
}
