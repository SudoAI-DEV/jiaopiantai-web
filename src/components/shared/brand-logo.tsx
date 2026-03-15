import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: number;
  className?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
  priority?: boolean;
}

export function BrandLogo({
  size = 40,
  className,
  iconWrapperClassName,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
  priority = false,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn("inline-flex shrink-0 items-center justify-center", iconWrapperClassName)}
        style={{ width: size, height: size }}
      >
        <Image
          src="/branding/jiaopiantai-logo-transparent.png"
          alt="蕉片台"
          width={size}
          height={size}
          priority={priority}
          className={cn("h-auto w-full object-contain", iconClassName)}
        />
      </span>
      {showWordmark ? (
        <span className={cn("font-semibold tracking-tight", wordmarkClassName)}>
          蕉片台
        </span>
      ) : null}
    </div>
  );
}
