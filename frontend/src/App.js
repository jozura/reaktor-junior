import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import './App.css';
import ProductsGrid from './components/ProductsGrid';
import GridHeader from './components/GridHeader';
import Navbar from './components/Navbar';

const proxy = process.env.REACT_APP_PROXY_SERVER_ADDR

function App() {
  const [products, setProducts] = useState('');
  const [selectedNav, setSelectedNav] = useState('Beanies');

  useEffect(() => {
    axios.get(`http://${proxy}/products/${selectedNav.toLowerCase()}`).then(res => {
      setProducts(res.data);
    }).catch(err => {
      console.log(err);
    })
  }, [selectedNav])

  return (
    <div className="App">
      <Navbar selectedCategory={selectedNav} selectNav={setSelectedNav}/>
      <div className="ListWrapper">
        <GridHeader/>
        <ProductsGrid products={products}/>
      </div>
    </div>
  );
}

export default App;
