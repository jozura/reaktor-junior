import {useEffect, useState} from 'react';
import axios from 'axios';
import './App.css';
import ProductList from './components/ProductList';

function App() {
  const [products, setProducts] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8080/products/beanies').then(res => {
      setProducts(res.data);
    }).catch(err => {
      console.log(err);
    })
  }, [])
  return (
    <div className="App">
      {console.log(products)}
      <ProductList products={products}/>
    </div>
  );
}

export default App;
