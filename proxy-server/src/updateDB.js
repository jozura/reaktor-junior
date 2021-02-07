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
const smembersAsync = promisify(redisClient.smembers).bind(redisClient);
const unlinkAsync = promisify(redisClient.unlink).bind(redisClient);
const hdelAsync = promisify(redisClient.hdel).bind(redisClient);
const saddAsync = promisify(redisClient.sadd).bind(redisClient);

async function removeDeletedProducts(category, newIds){
    let previousIds = await smembersAsync(`prev:${category}`);

    let prevSet = new Set(previousIds);
    let newSet = new Set(newIds);

    // Set difference (prevSet / newSet)
    let deletedIds = new Set([...prevSet].filter(id => !newSet.has(id)));

    let promises = [];
    deletedIds.forEach((id) => {
        promises.push(hdelAsync(category, id));
    });

    await Promise.allSettled(promises);
}

async function updatePreviousIds(category, newIds) {
     await unlinkAsync(`prev:${category}`);

    let newPromises = [];
    newIds.forEach(id => {
        newPromises.push(saddAsync(`prev:${category}`, id)); 
    });

    await Promise.allSettled(newPromises);
}

async function storeData(productData){
    let promises = [];
    for(productCategory of productData){
        let ids = []
        category = productCategory[0].type;
        productCategory.forEach(product => {
            let id = product.id;
            ids.push(id)
            let category = product.type;
            promises.push(hsetAsync(category,
                             id,
                             JSON.stringify(product))
            );
        });
        await removeDeletedProducts(category, ids);
        await updatePreviousIds(category, ids);
    }

    await Promise.allSettled(promises);
};

async function main(){
    let productData = await composeData();
    await storeData(productData);

    redisClient.quit();
    process.exit(0);
}

main();