import {React} from 'react';
import * as constants from './constants';

const productCategories = constants.PRODUCT_CATEGORIES;

export default function Navbar({selectedCategory, selectNav}) {
    return (
            <nav className='Nav'>
                <ul className='NavList'>
                    {productCategories.map((category, i) => 
                        <li className = {selectedCategory === category ? 'selectedNavEl' : 'NavEl'}
                        key={i}
                        onClick={() => selectNav(category)}>
                            {category}
                        </li>
                    )}
                </ul>
            </nav>
    )
}
