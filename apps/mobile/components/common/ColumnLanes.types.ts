export interface ColumnLanesProps {
  /** Flex weight of each column, shared by the header and the rows. */
  weights: number[];
  /** Smallest weight each column can shrink to. */
  minWeights: number[];
  onChange: (weights: number[]) => void;
  /** Horizontal padding of the rows; the lanes start and end inside it. */
  inset: number;
  /** Delimiter line color. */
  color: string;
  /** Line color while it is being dragged. */
  activeColor: string;
  /** Accessible name of each delimiter, e.g. "Resize Action and Source". */
  labels?: string[];
}
