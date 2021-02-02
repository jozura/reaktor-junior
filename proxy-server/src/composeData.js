// A script that gets all the data from both APIs and composes it into a better format.

const redis = require('redis');
const axios = require("axios");
const {promisify} = require('util');

const PRODUCT_CATEGORIES = ['facemasks', 'gloves' , 'beanies']
const API_SERVICE_URL = "https://bad-api-assignment.reaktor.com/v2";

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

const hsetAsync = promisify(redisClient.hset).bind(redisClient);


async function getAllProducts() {
    let productRequests = PRODUCT_CATEGORIES.map((category) =>
        axios.get(`${API_SERVICE_URL}/products/${category}`));

    let results = await Promise.allSettled(productRequests);
    let productData = []
    results.forEach((result) => {
        if(result.status === "fulfilled") {
            productData.push(result.value.data);
        } else {
            console.error(result.reason);
        }
    });

    return productData;
};

function searchForManufacturers(products) {
    let manufacturers = new Set();

    for(productCategory of products){
        for(product of productCategory){
            manufacturers.add(product.manufacturer);
        }
    }

    return Array.from(manufacturers);
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

async function getAllAvailabilityData(manufacturers) {
    let requests = manufacturers.map(manufacturer => getAvailabilityData(manufacturer));
    let results = await Promise.allSettled(requests);
    let availabilityData = [];
    results.forEach((result, i) => {
        if(result.status === "fulfilled") {
            availabilityData.push([manufacturers[i], result.value]);
        } else {
            console.error(result.reason);
        }
    });

    return availabilityData;
}

function getProductInstockValue(availabilityData){
    let instockTag = "<INSTOCKVALUE>";
    let instockMap = {};
    let instockTagLength = instockTag.length;
    for(productData of availabilityData) {
        let dataPayload = productData.DATAPAYLOAD;
        let productId = productData.id;
        let instockValueStartIndex = dataPayload.indexOf(instockTag) + instockTagLength;
        let tempString = dataPayload.substring(instockValueStartIndex);
        let instockValue = tempString.substring(0, tempString.indexOf("<"));
        instockMap[productId] = instockValue;
    }

    return instockMap;
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
    let promises = []
    for(productCategory of finalProductData){
        category = productCategory[0].type
        productCategory.forEach(product => {
            let productId = product.id;
            promises.push(hsetAsync(category,
                             productId,
                             JSON.stringify(product)
                             ));
        });
    }

    return Promise.allSettled(promises);
}

async function composeData(){
    let productData = await getAllProducts();
    let manufacturers = searchForManufacturers(productData);
    console.log(manufacturers);
    let availabilityData = await getAllAvailabilityData(manufacturers);
    let availability = {}
    availabilityData.forEach(manufacturerData => {
        let manufacturer = manufacturerData[0]
        let manufacturerAvailability = manufacturerData[1]
        availability[manufacturer] = getProductInstockValue(manufacturerAvailability);
    })

    finalProductData = []
    for(productCategory of productData) {
        let items = mergeProductAndAvailabilityData(productCategory, availability)
        finalProductData.push(items)
    }
    let start = process.hrtime()
    let result = await storeData(finalProductData);
    console.log(process.hrtime(start));
    redisClient.quit()
    process.exit(0);
}


composeData()