import {useEffect, useState, useRef} from 'react';
import axios from 'axios';
import './App.css';
import ProductsGrid from './components/ProductsGrid';
import GridHeader from './components/GridHeader';

const proxy = process.env.REACT_APP_PROXY_SERVER_ADDR

function App() {
  const [products, setProducts] = useState('');

  useEffect(() => {
    axios.get(`http://${proxy}/products/beanies`).then(res => {
      setProducts(res.data);
      console.log(res.data)
    }).catch(err => {
      console.log(err);
    })
  }, [])

  return (
    <div className="App">
      <div className="ListWrapper">
        <GridHeader/>
        <ProductsGrid products={products}/>
      </div>
    </div>
  );
}

export default App;
