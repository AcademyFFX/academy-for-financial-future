import Image from "next/image";
import type { HTMLAttributes } from "react";
import { OFFICIAL_AFF_LOGO_PATH } from "@/lib/aff-brand";

export const affLogoPaths = {
  official: OFFICIAL_AFF_LOGO_PATH,
  horizontal: OFFICIAL_AFF_LOGO_PATH,
  stacked: OFFICIAL_AFF_LOGO_PATH
} as const;

type LogoProps = HTMLAttributes<HTMLDivElement> & {
  priority?: boolean;
  imageClassName?: string;
};

export function AFFSealLogo({ className = "", imageClassName = "", priority = false, ...props }: LogoProps) {
  return (
    <div className={`relative inline-block ${className || "h-12 w-12"}`} {...props}>
      <Image src={affLogoPaths.stacked} alt="Academy for Financial Future emblem" fill priority={priority} sizes="48px" className={`object-contain ${imageClassName}`} />
    </div>
  );
}

export function AFFStandardLogo({ className = "", imageClassName = "", priority = false, ...props }: LogoProps) {
  return (
    <div className={`relative inline-block max-w-full ${className || "h-16 w-72"}`} {...props}>
      <Image src={affLogoPaths.horizontal} alt="Academy for Financial Future" fill priority={priority} sizes="288px" className={`object-contain object-left ${imageClassName}`} />
    </div>
  );
}

export function AFFInstitutionalLogo({ className = "", imageClassName = "", priority = false, ...props }: LogoProps) {
  return (
    <div className={`relative inline-block max-w-full ${className || "h-20 w-72"}`} {...props}>
      <Image src={affLogoPaths.stacked} alt="Academy for Financial Future - Learn, Grow, Prosper" fill priority={priority} sizes="288px" className={`object-contain ${imageClassName}`} />
    </div>
  );
}
