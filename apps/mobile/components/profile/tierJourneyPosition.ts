/**
 * Where a score sits on the tier journey line, in px from the line container's left edge.
 *
 * The tier nodes are spread evenly (node i is centred at (i + 0.5) / n of the width), but the
 * thresholds are not, so the position is interpolated piece by piece: from the start of the line
 * (0 Airs) to the first node, between nodes, and from the last node to the end of the line, which
 * stands for twice the last threshold.
 */
export function tierLinePosition(
  score: number,
  width: number,
  thresholds: readonly number[],
  inset = 14
): number {
  const count = thresholds.length;
  if (width <= 0 || count === 0) return 0;
  const safe = Number.isFinite(score) ? Math.max(0, score) : 0;
  const last = thresholds[count - 1];
  const anchors: Array<[number, number]> = [
    [0, inset],
    ...thresholds.map((threshold, index): [number, number] => [
      threshold,
      ((index + 0.5) * width) / count,
    ]),
    [last * 2, width - inset],
  ];
  for (let index = 1; index < anchors.length; index += 1) {
    const [toScore, toX] = anchors[index];
    if (safe <= toScore) {
      const [fromScore, fromX] = anchors[index - 1];
      const span = toScore - fromScore;
      return span > 0 ? fromX + ((safe - fromScore) / span) * (toX - fromX) : toX;
    }
  }
  return width - inset;
}
