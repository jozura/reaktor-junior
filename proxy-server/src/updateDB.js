// A script that updates the database with data from the legacy APIs

const {composeData} = require('./composeData')
const redis = require('redis');
const {promisify} = require('util');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

const hsetAsync = promisify(redisClient.hset).bind(redisClient);

function storeData(productData){
    let promises = [];
    for(productCategory of productData){
        category = productCategory[0].type;
        productCategory.forEach(product => {
            let id = product.id;
            let category = product.type;
            promises.push(hsetAsync(category,
                             id,
                             JSON.stringify(product))
            );
        });
    }

    return Promise.allSettled(promises);
};

async function main(){
    let productData = await composeData();
    await storeData(productData);
    redisClient.quit();

    process.exit(0);
}

main();