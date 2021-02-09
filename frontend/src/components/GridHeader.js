import React from 'react'

const properties = ['name', 'availability', 'id', 'manufacturer', 'price', 'color'];

export default function GridHeader() {
    let prop = properties.map((property, i) => 
        <div key={i}>{property}</div>
    )
    return (
        <div className="GridHeader">
            {console.log(prop)}
           {prop} 
        </div>
    )
}
