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

    return Array.from(manufacturers)
};

async function getAvailabilityData(manufacturer, tries = 5){
    if (tries === 0) {
        throw `Failed to get availability data for ${manufacturer}.`
    }

    let request;
    try {
        request = axios.get(`${API_SERVICE_URL}/availability/${manufacturer}`);
    } catch (error) {
        throw(error);
    }
    let response = await request;

    let availabilityData = response.data.response;
    if(availabilityData) {
        if(availabilityData !== "[]") return availabilityData;
    } else {
        throw `Availability data request didn't contain a response for ${manufacturer}.`;
    }

    if(tries > 0) {
        return getAvailabilityData(manufacturer, tries - 1)
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

    let availability = {}
    manufacturers.forEach(manufacturer => {
        let availabilityData;
        try {
            availabilityData = await getAvailabilityData(manufacturer);
        } catch(error) {
            console.error(error);
            return
        }
        availability[manufacturer] = getProductIDAndInstockvalue(availabilityData);
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