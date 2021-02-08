// A function that fetches and merges the product and availability data.
module.exports = {
    composeData: composeData
};

async function composeData(){
    let productData = await fetchProducts();
    let manufacturers = getManufacturers(productData);
    let availabilityData = await fetchAvailabilityData(manufacturers);
    let instockData = getInstockData(availabilityData);
    productData = appendInstockDataToProducts(productData, instockData);

    return productData;
}

const axios = require("axios");
const constants = require("./constants");

const PRODUCT_CATEGORIES = constants.PRODUCT_CATEGORIES;
const API_SERVICE_URL = constants.API_URL;

async function fetchProducts() {
    let productRequests = PRODUCT_CATEGORIES.map((category) =>
        axios.get(`${API_SERVICE_URL}/products/${category}`));

    let results = await Promise.all(productRequests);
    let productData = [];
    results.forEach((result, i) => {
        productData.push(result.data);
    });

    return productData;
};

function getManufacturers(productData) {
    let manufacturers = new Set();

    for(productsOfCategory of productData){
        productsOfCategory.forEach(product => {
            if(product.manufacturer) manufacturers.add(product.manufacturer);
        });
    }

    return Array.from(manufacturers);
};

async function fetchManufacturerAvailability(manufacturer, tries = 5){
    if (tries === 0) {
        throw new Error(`Failed to get availability data for ${manufacturer}.`);
    }

    let response = await axios.get(`${API_SERVICE_URL}/availability/${manufacturer}`);
    let availabilityData = response.data.response;
    if(availabilityData) {
        // Availability API sometime bugs out and returns an empty list
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
    let results = await Promise.all(requests);
    let availabilityData = [];
    results.forEach((result, i) => {
        availabilityData.push([manufacturers[i], result]);
    });

    return availabilityData;
};

function getInstockValue(productAvailabilityData) {
    let instockTag = "<INSTOCKVALUE>";
    let instockTagLength = instockTag.length;

    let instockValueStartIndex = productAvailabilityData.indexOf(instockTag) + instockTagLength;
    let tempString = productAvailabilityData.substring(instockValueStartIndex);
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

function appendInstockDataToProducts(productData, instockData){
    let productsWithInstockData = [];
    for(productsOfCategory of productData) {
        let productsOfCategoryWithInstockData = [];

        productsOfCategory.forEach(product => {
            let manufacturer = product.manufacturer;
            // Availability API has product IDs in all uppercase hence 'id.toUpperCase'
            product["availability"] = instockData[manufacturer][product.id.toUpperCase()];
            productsOfCategoryWithInstockData.push(product);
        })
        productsWithInstockData.push(productsOfCategoryWithInstockData);
    }

    return productsWithInstockData;
};