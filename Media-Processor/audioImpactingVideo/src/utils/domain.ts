export function map(
    value: number,
    fromMin: number,
    fromMax: number,
    toMin: number,
    toMax: number
): number {
    return ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin) + toMin;
}

export function clip(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}
