import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Type guard to check if a value is a Firestore Timestamp
export function isTimestamp(value: any): value is Timestamp {
 return typeof value === 'object' && value !== null && value instanceof Timestamp;
}