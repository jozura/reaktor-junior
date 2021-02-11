import React from 'react';
import * as constants from './constants';

const properties = constants.PRODUCT_PROPERTIES;

export default function GridHeader() {
    let prop = properties.map((property, i) => 
        <div key={i}>{property}</div>
    )
    return (
        <div className="GridHeader">
           {prop} 
        </div>
    )
}
