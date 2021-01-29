// A script that composes the data from both legacy APIs and stores it in a Redis database.

const redis = require('redis');
const axios = require("axios");

const PRODUCT_CATEGORIES = ['facemasks', 'gloves' , 'beanies']
const API_SERVICE_URL = "https://bad-api-assignment.reaktor.com/v2";

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

function requestAllProducts() {
    let productRequests = PRODUCT_CATEGORIES.map((category) =>
        axios.get(`${API_SERVICE_URL}/products/${category}`));

    return Promise.all(productRequests);
};

function searchForManufacturers(products) {
    let manufacturers = new Set();

    for(productCategory of products){
        for(product of productCategory){
            manufacturers.add(product.manufacturer);
        }
    }
    manufacturers = Array.from(manufacturers)
    return manufacturers;
};

function requestAvailabilityData(manufacturers) {
    let availabilityRequests = manufacturers.map((manufacturer) => 
        axios.get(`${API_SERVICE_URL}/availability/${manufacturer}`
    ))
    
    let availabilityDataResponses = Promise.all(availabilityRequests);
    
    return availabilityDataResponses;
}

async function getAvailabilityData(manufacturers, max_depth){
    let availabilityDataResponses = await requestAvailabilityData(manufacturers);
    let allAvailabilityData = [];
    let buggedOutRequests = [];
    availabilityDataResponses.forEach((response, i) => {
        if (response.data.response === '[]'){
            buggedOutRequests.push(manufacturers[i]);
        } else {
            let availabilityData = response.data.response
            if(availabilityData) allAvailabilityData.push(availabilityData);
        }
    })

    console.log(allAvailabilityData)
    if (!buggedOutRequests.length || max_depth == 0){
        return allAvailabilityData;
    } else {
        return allAvailabilityData.concat(await getAvailabilityData(buggedOutRequests, max_depth - 1))
    }
}

async function requestAllData(){
    let manufacturers;
    let allProducts;
    let allAvailabilityData;
    allProductsResponses = await requestAllProducts()
    allProducts = allProductsResponses.map(response => response.data)
    manufacturers = searchForManufacturers(allProducts);
    allAvailabilityData = await getAvailabilityData(manufacturers, 5);

    return allAvailabilityData
}

requestAllData().then((allProducts) => {
    allProducts.forEach(data => console.log(data.length))
})