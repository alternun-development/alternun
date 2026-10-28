export type OrderControlsProps = {
  index: number;
  count: number;
  disabled: boolean;
  onMove: (delta: -1 | 1) => void;
};
