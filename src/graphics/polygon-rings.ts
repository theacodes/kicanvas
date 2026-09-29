import type { Vec2 } from "../base/math";

/**
 * KiCad stores holes in a filled polygon by joining each hole to the exterior
 * with a pair of opposite edges. Split those walks into separate contours so
 * each contour can be triangulated independently. Ambiguous walks retain the
 * original triangulation path.
 */
export function split_bridged_polygon(ring: Vec2[]): Vec2[][] {
    const count = ring.length;
    // Two non-degenerate contours and their bridge need at least eight points.
    if (count < 8) return [ring];
    const next = new Uint32Array(count);
    const pending = new Map<string, number[]>();
    for (let i = 0; i < count; i++) next[i] = (i + 1) % count;

    let bridges = 0;
    for (let i = 0; i < count; i++) {
        const j = next[i]!;
        const a = ring[i]!;
        const b = ring[j]!;
        if (a.x === b.x && a.y === b.y) continue;
        const forward = `${a.x},${a.y}|${b.x},${b.y}`;
        const reverse = `${b.x},${b.y}|${a.x},${a.y}`;
        const matches = pending.get(reverse);
        if (matches?.length) {
            const mate = matches.pop()!;
            next[i] = (mate + 1) % count;
            next[mate] = j;
            bridges++;
        } else {
            const matches = pending.get(forward) ?? [];
            matches.push(i);
            pending.set(forward, matches);
        }
    }
    if (!bridges) return [ring];

    const seen = new Uint8Array(count);
    const contours: { points: Vec2[]; area: number }[] = [];
    for (let start = 0; start < count; start++) {
        if (seen[start]) continue;
        const points: Vec2[] = [];
        let at = start;
        let area = 0;
        do {
            if (seen[at]) return [ring];
            seen[at] = 1;
            const following = next[at]!;
            const a = ring[at]!;
            const b = ring[following]!;
            if (!points.length || !a.equals(points.at(-1)!)) points.push(a);
            area += a.x * b.y - b.x * a.y;
            at = following;
        } while (at !== start);
        if (points.length > 1 && points[0]!.equals(points.at(-1)!)) {
            points.pop();
        }
        if (points.length < 3) return [ring];
        contours.push({ points, area });
    }

    const outer = contours.reduce(
        (largest, contour, index) =>
            Math.abs(contour.area) > Math.abs(contours[largest]!.area)
                ? index
                : largest,
        0,
    );
    const sign = Math.sign(contours[outer]!.area);
    if (
        !sign ||
        contours.some(
            (contour, index) =>
                index !== outer && Math.sign(contour.area) === sign,
        )
    ) {
        return [ring];
    }
    return [
        contours[outer]!.points,
        ...contours.filter((_, index) => index !== outer).map((c) => c.points),
    ];
}
