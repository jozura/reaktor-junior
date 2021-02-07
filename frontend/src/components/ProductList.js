import React from 'react';
import { FixedSizeList } from 'react-window';
const Row = ({ index, style, data }) => {
    let productData = JSON.parse(data[index]);
    return(
      <div style={style}>
         {productData.name}
      </div>
    );
};

export default function ProductList({products}) {
        return(
        <FixedSizeList
          height={800}
          width={"100%"}
          itemSize={120}
          itemData={products}
          itemCount={products.length}
        >
        {Row}
        </FixedSizeList>)
};