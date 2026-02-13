export function getDefaultStickerLayout(position?: string) {
  switch (position) {
    case "bottom-left":
      return { x: 18, y: 84, size: 22 };
    case "top-right":
      return { x: 82, y: 18, size: 22 };
    case "center-right":
      return { x: 85, y: 50, size: 24 };
    case "bottom-right":
    default:
      return { x: 82, y: 84, size: 22 };
  }
}

export function clampStickerValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
