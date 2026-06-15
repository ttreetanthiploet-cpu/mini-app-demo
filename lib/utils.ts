import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtBaht = (n: string | number): string =>
  Number(String(n).replace(/[^\d.]/g, "") || 0).toLocaleString("th-TH");

export const groupDigits = (s: string | number | undefined | null): string => {
  if (s === undefined || s === null || s === "") return "";
  return Number(String(s).replace(/[^\d]/g, "")).toLocaleString("th-TH");
};

export const nowTime = (): string => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));
