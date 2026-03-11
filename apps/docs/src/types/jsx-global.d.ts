import type * as React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement;
    interface IntrinsicAttributes extends React.Attributes {}
  }
}

export {};
