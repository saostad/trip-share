import type { Variants } from "motion/react";

export const duration = {
  fast: 0.15,
  base: 0.22,
  slow: 0.3,
} as const;

export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: duration.base, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: easeOut },
  },
};

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: duration.fast, ease: easeOut },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: easeOut },
  },
};
