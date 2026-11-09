export interface WishItem {
  id: string;
  position: [number, number, number];
  brightness: number;
  size: number;
  createdAt: number;
  isPublic: boolean;
  isOwner?: boolean;
  text?: string | null;
}

export interface VisitorStatus {
  canSubmit: boolean;
  remainingSlots?: number;
  usedSlots?: number;
  maxSlots?: number;
  remainingMs: number;
  nextEligibleTime: number;
  totalWishes: number;
  lastWish: {
    id: string;
    text: string;
    createdAt: number;
    isPublic: boolean;
    position: [number, number, number];
  } | null;
  myWishes?: Array<{
    id: string;
    text: string;
    createdAt: number;
    isPublic: boolean;
    position: [number, number, number];
  }>;
}

export type ExperienceStep = 
  | 'intro'            // Cinematic opening intro (4s)
  | 'paper'            // Floating paper writing screen
  | 'confirming'       // Confirmation dialog ("這是你真正的願望嗎？")
  | 'transforming'     // Paper-to-star transformation & camera journey
  | 'star_arrived'     // Arrival in the constellation & final message
  | 'explore';         // Free 3D starry sky exploration mode
