import { VariableSizeGrid as Grid } from 'react-window';
import {AutoSizer} from "react-virtualized";
import * as constants from "./constants";

const properties = constants.PRODUCT_PROPERTIES; 
const columnWidths = [275, 150, 250, 100, 75, 150];
const gridHeaderHeight = 20;

const Cell = ({ data, columnIndex, rowIndex, style }) => { 
    let value = data[rowIndex][properties[columnIndex]];
    if (columnIndex === 5) value = value.join(', ');
    return (
    <div style={style} className={rowIndex % 2 ? "GridRowOdd" : "GridRowEven"}>
        {value}
    </div>);
}
export default function ProductsGrid({products}) {
    if(products) {
        return (
        <AutoSizer> 
        {({ height, width }) => (
            <Grid
               className="Grid"
               columnCount={6}
               columnWidth={index => columnWidths[index]}
               height={height - gridHeaderHeight}
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
}