// A function that fetches and merges the product and availability data.
module.exports = {
    composeData: composeData
};

async function composeData(){
    let products = await fetchProducts();
    let manufacturers = getManufacturers(products);
    let availabilityData = await fetchAvailabilityData(manufacturers);
    let instockData = getInstockData(availabilityData);
    products = appendInstockDataToProducts(products, instockData);

    return products;
}

const axios = require("axios");
const constants = require("./constants");

const PRODUCT_CATEGORIES = constants.PRODUCT_CATEGORIES;
const API_SERVICE_URL = constants.API_URL;

async function fetchProducts() {
    let productRequests = PRODUCT_CATEGORIES.map((category) =>
        axios.get(`${API_SERVICE_URL}/products/${category}`));

    let results = await Promise.allSettled(productRequests);
    let productData = [];
    results.forEach((result) => {
        if(result.status === "fulfilled") {
            productData.push(result.value.data);
        } else {
            console.error(result.reason);
        }
    });

    return productData;
};

function getManufacturers(products) {
    let manufacturers = new Set();

    for(productCategory of products){
        productCategory.forEach(product => {
            manufacturers.add(product.manufacturer);
        });
    }

    return Array.from(manufacturers);
};

async function fetchManufacturerAvailability(manufacturer, tries = 5){
    if (tries === 0) {
        throw new Error(`Failed to get availability data for ${manufacturer}.`);
    }

    let response;
    try {
        response = await axios.get(`${API_SERVICE_URL}/availability/${manufacturer}`);
    } catch (error) {
        throw new Error(error);
    }

    let availabilityData = response.data.response;
    if(availabilityData) {
        if(availabilityData !== "[]") {
            return availabilityData;
        } else {
            return fetchManufacturerAvailability(manufacturer, tries - 1);
        }
    } else {
        throw new Error(`Availability data request didn't contain a response for ${manufacturer}.`);
    }
};

async function fetchAvailabilityData(manufacturers) {
    let requests = manufacturers.map(manufacturer => fetchManufacturerAvailability(manufacturer));
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
};

function getInstockValue(productData) {
    let instockTag = "<INSTOCKVALUE>";
    let instockTagLength = instockTag.length;

    let instockValueStartIndex = productData.indexOf(instockTag) + instockTagLength;
    let tempString = productData.substring(instockValueStartIndex);
    let instockValue = tempString.substring(0, tempString.indexOf("<"));

    return instockValue;
}

function getInstockData(availabilityData){
    let instockMap = {};

    for(manufacturerData of availabilityData) {
        let manufacturer = manufacturerData[0];
        let manufacturerAvailabilityData = manufacturerData[1];

        let manufacturerInstockMap = {};
        manufacturerAvailabilityData.forEach(productData => {
            let productId = productData.id;
            let dataPayload = productData.DATAPAYLOAD;
            let instockValue = getInstockValue(dataPayload);
            manufacturerInstockMap[productId] = instockValue;
        })

        instockMap[manufacturer] = manufacturerInstockMap;
    }

    return instockMap;
};

function appendInstockDataToProducts(products, instockData){
    let productData = [];
    for(productCategory of products) {
        let productsOfCategory = [];

        productCategory.forEach(product => {
            let manufacturer = product.manufacturer;
            // Availability API has product IDs in all uppercase hence 'id.toUpperCase'
            product["availability"] = instockData[manufacturer][product.id.toUpperCase()];
            productsOfCategory.push(product);
        })
        productData.push(productsOfCategory);
    }

    return productData;
};