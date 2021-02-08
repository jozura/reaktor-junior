const rewire = require("rewire");
const composeDataFuncs = rewire("../src/composeData");
const constants = require("../src/constants");
const suppressLogs = require('mocha-suppress-logs');
const chai = require("chai");
chai.use(require('chai-as-promised'))
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
        // Suppress console output for successful tests.
        suppressLogs();

        it("Returns a list which contains a list for each product category.",
         async () => {
            let productData = await fetchProducts();
            let productCategories = constants.PRODUCT_CATEGORIES;
            expect(productCategories.length).to.eql(productData.length);
        });

        it("Each product category list should contain Product type objects.", async () => {
            let productData = await fetchProducts();
            let products = productData.flat();
            let success = true;
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

        it(`Should throw if even one of the requests fail.`,
        async () => {
            let productCategories = constants.PRODUCT_CATEGORIES;
            productCategories.forEach((productCategory, i) => {
                let statusCode = i === 0 ? 500 : 200;
                mockAPI.get(`/products/${productCategory}`)
                .reply(statusCode, {
                    data: [
                        "mockProduct" 
                    ] 
                })
            });

            await expect(fetchProducts()).to.be
                .rejectedWith(Error);
        });

    });

    describe("getManufacturers(products)", () => {
        it(`Should find all the manufacturers from product data.`, () => {
            let mockProducts = [
                [{manufacturer: 'a'}, {manufacturer: 'b'}],
                [{manufacturer: 'c'}, {manufacturer: 'b'}],
                [{manufacturer: 'a'}, {manufacturer: 'c'}]
            ];
            let manufacturers = ['a', 'b', 'c'];
            let foundManufacturers = getManufacturers(mockProducts);
            expect(foundManufacturers).to.have.members(manufacturers);
        });
    });

    describe(`fetchManufacturerAvailability(manufacturer)`, () => {
        it('Should throw if availability API returns an empty list too many times.', async () => {
            mockAPI.get(`/availability/test`).times(5)
            .reply(200, {
                code: 200,
                response: "[]"
            })
            await expect(fetchManufacturerAvailability('test')).to.be
                .rejectedWith(Error);
        });

        it('Should throw if manufacturer does not exist.', async () => {
            await expect(fetchManufacturerAvailability('nonexistantmanufacturer')).to.be
                .rejectedWith(Error);
        });

        it('Should return availability data if request doesnt fail.', async () => {
            mockAPI.get('/availability/test')
            .reply(200, {
                code: 200,
                response:
                    [
                        {
                            "id": "4C0CF8BA2470BE252EF3BA12",
                            "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"
                        }
                    ]
            })

            let availabilityData = await fetchManufacturerAvailability('test');
            expect(availabilityData[0]).to.eql({id: "4C0CF8BA2470BE252EF3BA12",
            DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"});
        });

        it('Should return data even if the API bugs out a few times.', async () => {
            mockAPI.get('/availability/test')
            .reply(200, {
                code: 200,
                response:
                    [
                        {
                            "id": "4C0CF8BA2470BE252EF3BA12",
                            "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"
                        }
                    ]
            });

            mockAPI.get('/availability/test').times(4)
            .reply(200, {
                code: 200,
                response: "[]"
            })

            let availabilityData = await fetchManufacturerAvailability('test');
            expect(availabilityData[0]).to.eql({id: "4C0CF8BA2470BE252EF3BA12",
            DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"});
        });
    });

    describe('fetchAvailabilityData(manufacturers)', () => {
        suppressLogs();

        it(`Should return a list with availability data for each manufacturer
        for which the data is available.`, async () => {
            mockAPI.get("/availability/test1").reply(
                200, {
                    code: 200,
                    response: "passed"
                }
            );

            mockAPI.get("/availability/test2").reply(
                200, {
                    code: 200,
                    response: "passed"
                }
            );

            manufacturers = ["test1", "test2"];

            let availabilityData = await fetchAvailabilityData(manufacturers);
            expect(availabilityData).to.eql([["test1", "passed"], ["test2", "passed"]]);
        });

        it(`Should throw if even one of the requests fail.`, async () => {
            mockAPI.get("/availability/test1").reply(
                200, {
                    code: 200,
                    response: "passed"
                }
            );

            mockAPI.get("/availability/test2").reply(
                200, {
                    code: 200,
                    response: "passed"
                }
            );

            mockAPI.get("/availability/test3").reply(
                500, {
                }
            );

            manufacturers = ["test1", "test2", "test3"];

            await expect(fetchAvailabilityData(manufacturers)).to.be
                .rejectedWith(Error);
        });
    });

    describe("getInstockValue(productAvailabilityData)", () => {
        it("Should return the instock value", () => {
            let productAvailabilityData = "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>LESSTHAN10</INSTOCKVALUE>\n</AVAILABILITY>";
            let instockValue = getInstockValue(productAvailabilityData);

            expect(instockValue).to.eql("LESSTHAN10")
        });
    });

    describe("getInstockData(availabilityData)", () => {
       it("Should return a map for each manufacturer that contains product ids and their instock values", () => {
           let availabilityData = [["manufacturer1", [
            {
                "id": "F00F2E90CD7D537EF4",
                "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"
            },
            {
                "id": "C4142ED1E7EE746E745",
                "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"
            }]],
                                   ["manufacturer2", [            
            {
                "id": "505F2550C234537AG4",
                "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"
            },
            {
                "id": "E42422D1222E746E745",
                "DATAPAYLOAD": "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>LESSTHAN10</INSTOCKVALUE>\n</AVAILABILITY>"
            }
            ]]];

            let instockData = getInstockData(availabilityData);
            let expectedOutput = {
                "manufacturer1": {
                    "F00F2E90CD7D537EF4": "INSTOCK",
                    "C4142ED1E7EE746E745": "INSTOCK"                                      
                },
                "manufacturer2": {
                    "505F2550C234537AG4": "INSTOCK",
                    "E42422D1222E746E745": "LESSTHAN10"
                }
            };

            expect(instockData).to.eql(expectedOutput);
       });
    });

    describe("appendInstockDataToProducts(products, instockData)", () => {
        it(`Should return a list of lists of products for each product category
        where the products have the instock field added to them.`, () => {
            let p1 = {id: "testid1", type: "gloves", name: "name1", color: ["blue"], price: 10, manufacturer: "manufacturer1"};
            let p2 = {id: "testid2", type: "facemasks", name: "name2", color: ["blue"], price: 10, manufacturer: "manufacturer2"};
            let p3 = {id: "testid3", type: "gloves", name: "name3", color: ["blue"], price: 10, manufacturer: "manufacturer2"};

            instockData = {
                "manufacturer1":
                {
                    "TESTID1": "INSTOCK"
                },
                "manufacturer2": 
                {
                    "TESTID2": "INSTOCK",
                    "TESTID3": "INSTOCK"
                }
            };

            let products = [[p2], [p1, p3]];
            products = appendInstockDataToProducts(products, instockData);
            let p1c, p2c, p3c;
            p1c = {...p1};
            p2c = {...p2};
            p3c = {...p3};
            p1c["availability"] = "INSTOCK";
            p2c["availability"] = "INSTOCK";
            p3c["availability"] = "INSTOCK";
           
            expectedOutput = [[p2c], [p1c, p3c]];
            expect(products).to.eql(expectedOutput);
        });
    });

    describe("composeData()", () => {
        suppressLogs();

        it("Should return the same number of products as initially are fetched from the products API.", async () => {
            let p1 = {id: "testid1", type: "gloves", name: "name1", color: ["blue"], price: 10, manufacturer: "manufacturer1"};
            let p2 = {id: "testid2", type: "facemasks", name: "name2", color: ["blue"], price: 10, manufacturer: "manufacturer2"};
            let p3 = {id: "testid3", type: "gloves", name: "name3", color: ["blue"], price: 10, manufacturer: "manufacturer2"};
            let p4 = {id: "testid4", type: "beanies", name: "name4", color: ["blue"], price: 10, manufacturer: "manufacturer2"};
          

            mockAPI.get('/products/gloves').times(2).reply(200, [
                p1, p3
            ]);

            mockAPI.get('/products/facemasks').times(2).reply(200, [
                p2
            ]);

            mockAPI.get('/products/beanies').times(2).reply(200, [
                p4 
            ]);


            mockAPI.get('/availability/manufacturer1').reply(200, {
                "code": "200",
                "response": [
                    {id: "TESTID1",
                    DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"},
                    {id: "TESTID4",
                    DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"}
                ]
            }).persist();

            mockAPI.get('/availability/manufacturer2').reply(200, {
                "code": "200",
                "response": [
                    {id: "TESTID2",
                    DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"},
                    {id: "TESTID3",
                    DATAPAYLOAD: "<AVAILABILITY>\n  <CODE>200</CODE>\n  <INSTOCKVALUE>INSTOCK</INSTOCKVALUE>\n</AVAILABILITY>"}
                ]
            });
            let nProducts;
            let products = await fetchProducts();
            products.forEach(productCategory => {nProducts += productCategory.length});
            console.log(products);
            let nComposedProducts;
            let composedProducts = await composeData();
            composedProducts.forEach(productCategory => {nComposedProducts += productCategory.length});

            expect(nComposedProducts).to.eql(nProducts);
        });
    });
});