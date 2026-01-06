declare module 'react-responsive-masonry' {
  import React from 'react';

  export interface MasonryProps {
    columnsCount?: number | Record<string, number>;
    gutter?: string | number;
    children?: React.ReactNode;
  }

  const Masonry: React.FC<MasonryProps>;
  export const ResponsiveMasonry: React.FC<any>;
  export default Masonry;
}
