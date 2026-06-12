import Image from "next/image";
import type { HTMLAttributes } from "react";

export const affLogoPaths = {
  official: "/brand/AFF_LOGO_2_OFFICIAL.png",
  horizontal: "/brand/AFF_LOGO_2_OFFICIAL.png",
  stacked: "/brand/AFF_LOGO_2_OFFICIAL.png"
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
