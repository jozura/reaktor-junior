import {React} from 'react'

const PRODUCT_CATEGORIES = ['Beanies', 'Facemasks', 'Gloves']

export default function Navbar({selectedCategory, selectNav}) {
    return (
            <nav>
                <ul>
                    {PRODUCT_CATEGORIES.map((category, i) => 
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
