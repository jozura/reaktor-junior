import {useEffect, useState} from 'react';
import axios from 'axios';
import './App.css';
import ProductsGrid from './components/ProductsGrid';
import GridHeader from './components/GridHeader';
import Navbar from './components/Navbar';
import * as constants from './components/constants';

const proxy = process.env.REACT_APP_PROXY_SERVER_ADDR;
const productCategories = constants.PRODUCT_CATEGORIES;

function App() {
  const [products, setProducts] = useState([]);
  const [selectedNav, setSelectedNav] = useState(productCategories[0]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    axios.get(`http://${proxy}/products/${selectedNav.toLowerCase()}`).then(res => {
      setErrorMessage('');
      setProducts(res.data);
    }).catch(err => {
      setErrorMessage(`${err}`);
      setProducts([]);
      console.log(err);
    })
  }, [selectedNav])

  return (
    <div className="App">
      <Navbar selectedCategory={selectedNav} selectNav={setSelectedNav}/>
      {errorMessage && <h3>{errorMessage}</h3>}
      <div className="GridWrapper">
        <GridHeader/>
        <ProductsGrid products={products}/>
      </div>
    </div>
  );
}

export default App;
