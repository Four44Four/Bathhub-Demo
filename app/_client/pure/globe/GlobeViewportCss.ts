export function dimensionCss(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}
