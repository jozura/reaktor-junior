const redis = require('redis');
const axios = require("axios");

const PRODUCT_CATEGORIES = ['facemasks', 'gloves' , 'beanies']
const API_SERVICE_URL = "https://bad-api-assignment.reaktor.com/v2";

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

function getAllProducts() {
    let productRequests = PRODUCT_CATEGORIES.map((category) =>
        axios.get(`${API_SERVICE_URL}/products/${category}`));

    return Promise.all(productRequests);
}

getAllProducts().then( responses => {
    responses.forEach(response => {
        console.log(response.data);
    })
})

console.log('lol')