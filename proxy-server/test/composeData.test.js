const rewire = require("rewire");
const composeDataFuncs = rewire("../src/composeData");
const constants = require("../src/constants");
const suppressLogs = require('mocha-suppress-logs');
const chai = require("chai");
const nock = require("nock");
const expect = chai.expect;

const fetchProducts = composeDataFuncs.__get__("fetchProducts");
const getManufacturers = composeDataFuncs.__get__("getManufacturers");
const fetchManufacturerAvailability = composeDataFuncs.__get__("fetchManufacturerAvailability");
const fetchAvailabilityData = composeDataFuncs.__get__("fetchAvailabilityData");
const getInstockValue = composeDataFuncs.__get__("getInstockValue");
const getInstockData = composeDataFuncs.__get__("getInstockData");
const appendInstockDataToProducts = composeDataFuncs.__get__("appendInstockDataToProducts");
const composeData = composeDataFuncs.__get__("composeData");

mockAPI = nock(constants.API_URL);

describe("composeData.js", () => {
    describe("fetchProducts()", () => {
        // Suppress console output for successful test.
        suppressLogs();

        it("Returns a list which contains a list for each product category.",
         async () => {
            let productData = await fetchProducts();
            let productCategories = constants.PRODUCT_CATEGORIES;
            expect(productCategories.length).to.eql(productData.length);
        });

        it("Each product category list should contain Product type objects", async () => {
            let productData = await fetchProducts();
            let products = productData.flat();
            let success = true
            products.forEach(product => {
                let productTypeFields = ["id", "type", "name", "color", "price", "manufacturer"];
                let productFields = Object.keys(product);
                let includesFields = productTypeFields.every(field => productFields.includes(field));
                if(!(includesFields && productFields.length === productTypeFields.length)){
                    success = false;
                }
            });
            expect(success).to.eql(true);
        });

        it(`Should return a list with as many lists as requests that
        get response 2XX`,
        async () => {
            let productCategories = constants.PRODUCT_CATEGORIES;
            productCategories.forEach((productCategory, i) => {
                let statusCode = i === 0 ? 200 : 500;
                mockAPI.get(`/products/${productCategory}`)
                .reply(statusCode, {
                    data: [
                        "mockProduct" 
                    ] 
                })
            });
            let products = await fetchProducts();            
            expect(products.length).to.eql(1);
        });

        it(`Should return an empty list if API response status code
        does not equal 2XX for any of the requests`,
        async () => {
            let productCategories = constants.PRODUCT_CATEGORIES;
            productCategories.forEach((productCategory) => {
                mockAPI.get(`/products/${productCategory}`)
                .reply(500, {
                    data: "test"
                })
            });
            let productData = await fetchProducts();

            expect(productData).to.eql([]);
        });

    })
})