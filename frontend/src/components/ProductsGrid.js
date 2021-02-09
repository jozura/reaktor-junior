import { VariableSizeGrid as Grid } from 'react-window';
import {AutoSizer} from "react-virtualized";

const properties = ['name', 'availability', 'id', 'manufacturer', 'price', 'color'];
const columnWidths = [150, 200, 300, 100, 100, 150];

const Cell = ({ data, columnIndex, rowIndex, style }) => { 
    let value = data[rowIndex][properties[columnIndex]]
    if (columnIndex == 5) value = value.join(', ');
    return (
    <div style={style} className={rowIndex % 2 ? "ListItemOdd" : "ListItemEven"}>
        {value}
    </div>);
}
export default function ProductsGrid({products}) {
    return (
    <AutoSizer> 
    {({ height, width }) => (
        <Grid
           className="Grid"
           columnCount={6}
           columnWidth={index => columnWidths[index]}
           height={height}
           rowCount={products.length}
           rowHeight={() => 50}
           width={width}
           itemData={products}
           overscanColumnCount={10}
        >
        {Cell}
        </Grid>
    )}
    </AutoSizer>);
}