import React from 'react';
import { FixedSizeList } from 'react-window';
import {AutoSizer} from "react-virtualized";

const Product = ({ index, style, data }) => {
    let productData = data[index];
    return(
      <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
         {productData.name}
      </div>
    );
};

export default function Products({products}) {
  return (<AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          className="List"
          height={height}
          itemCount={products.length}
          itemData={products}
          itemSize={150}
          width={width}
          overscanCount={30}
        >
          {Product}
        </FixedSizeList>
      )}
    </AutoSizer>);
};