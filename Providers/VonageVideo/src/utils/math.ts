/**
 * Clip a value in a given range.
 *
 * @example
 * ```ts
 * clip(10, 5, 15); // 10
 * clip(2, 5, 15); // 5
 * clip(30, 5, 15); // 15
 * ```
 *
 * @param value Value to clip
 * @param min Minimum range value
 * @param max Maximum range value
 * @returns Clipped value
 */
export function clip(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Convert a value from a given range to another one.
 *
 * @example
 * ```ts
 * map(0.5, 0, 1, 0, 10); // 5
 * map(0.5, -1, 1, 0, 100); // 75
 * ```
 *
 * @param value Value to clip
 * @param fromMin Minimum original range value
 * @param fromMax Maximum original range value
 * @param toMin Minimum target range value
 * @param toMax Maximum target range value
 * @returns Converted value
 */
export function map(
    value: number,
    fromMin: number,
    fromMax: number,
    toMin: number,
    toMax: number
): number {
    return ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin) + toMin;
}
