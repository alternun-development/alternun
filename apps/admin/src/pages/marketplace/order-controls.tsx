import { marketplaceCopy } from '../../marketplace/copy';
import type { OrderControlsProps } from './order-controls.types';

export function OrderControls({ index, count, disabled, onMove }: OrderControlsProps): JSX.Element {
  return (
    <div className='marketplace-order-controls'>
      <button
        className='secondary-button'
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        type='button'
      >
        {marketplaceCopy.ordering.moveUp}
      </button>
      <button
        className='secondary-button'
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
        type='button'
      >
        {marketplaceCopy.ordering.moveDown}
      </button>
    </div>
  );
}
