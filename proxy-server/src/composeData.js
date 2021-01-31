// A script that gets all the data from both APIs and composes it into a better format.

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

// This probably needs refactoring
async function getAvailabilityData(manufacturers, max_depth){
    let availabilityDataResponses = await requestAvailabilityData(manufacturers);
    let allAvailabilityData = [];
    let buggedOutRequests = [];
    availabilityDataResponses.forEach((response, i) => {
        if (response.data.response === '[]'){
            buggedOutRequests.push(manufacturers[i]);
        } else {
            let availabilityData = response.data.response;
            let manufacturer = manufacturers[i];
            if(availabilityData) allAvailabilityData.push([manufacturer, availabilityData]);
        }
    })

    if (!buggedOutRequests.length || max_depth == 0){
        return allAvailabilityData;
    } else {
        return allAvailabilityData.concat(await getAvailabilityData(buggedOutRequests, max_depth - 1))
    }
}

function getProductIDAndInstockvalue(availabilityData){
    let inStockTag = "<INSTOCKVALUE>";
    let availabilityMap = {}
    let inStockTagLength = inStockTag.length
    for(productData of availabilityData) {
        let dataPayload = productData.DATAPAYLOAD
        let id = productData.id
        let inStockValueStartIndex = dataPayload.indexOf(inStockTag) + inStockTagLength;
        let asd = dataPayload.substring(inStockValueStartIndex)
        let inStockValue = asd.substring(0, asd.indexOf("<"))
        console.log(id, inStockValue);
        availabilityMap[id] = inStockValue
    }

    return availabilityMap;
}

function mergeProductAndAvailabilityData(productsOfCategory, availability){
    let products = []
    for(product of productsOfCategory) {
        let manufacturer = product.manufacturer;
        product["availability"] = availability[manufacturer][product.id.toUpperCase()];
        products.push(product);
    }

    return products;
}

function storeData(finalProductData){
    for (productCategory of finalProductData){
        category = productCategory[0].type
        let jsonobjs = []
        for(product of productCategory){
            jsonobjs.push(JSON.stringify(product))
        }
        redisClient.hmset(category, jsonobjs, redis.print)
    }
}

// Refactor
async function composeData(){
    let manufacturers;
    let allProducts;
    let allAvailabilityData;
    allProductsResponses = await requestAllProducts()
    allProducts = allProductsResponses.map(response => response.data)
    manufacturers = searchForManufacturers(allProducts);
    allAvailabilityData = await getAvailabilityData(manufacturers, 5);

    let availability = {}
    allAvailabilityData.forEach(data => {
        let manufacturer = data[0];
        let availabilityData = data[1];
        let manufacturerAvailabilityMap = getProductIDAndInstockvalue(availabilityData);
        availability[manufacturer] = manufacturerAvailabilityMap;
    })

    finalProductData = []
    for(productCategory of allProducts) {
        let items = mergeProductAndAvailabilityData(productCategory, availability)
        finalProductData.push(items)
    }

    storeData(finalProductData);
    return finalProductData;
}


composeData()