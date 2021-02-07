// A script that updates the database with data from the legacy APIs

const {composeData} = require('./composeData')
const redis = require('redis');
const PRODUCT_CATEGORIES = require('./constants').PRODUCT_CATEGORIES;
const {promisify} = require('util');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS
});

const smembersAsync = promisify(redisClient.smembers).bind(redisClient);

async function removeDeletedProducts(category, newIds, commandQueue){
    let previousIds = await smembersAsync(`prev:${category}`);

    let prevSet = new Set(previousIds);
    let newSet = new Set(newIds);

    // Set difference (prevSet / newSet)
    let deletedIds = new Set([...prevSet].filter(id => !newSet.has(id)));

    deletedIds.forEach((id) => {
        commandQueue.hdel(category, id);
    });

    return commandQueue;
}

function updatePreviousIds(category, newIds, commandQueue) {
    commandQueue.unlink(`prev:${category}`);

    newIds.forEach(id => {
        commandQueue.sadd(`prev:${category}`, id); 
    });

    return commandQueue
}

function getProductIds(productCategory){
    let ids = [];
    productCategory.forEach(product => {
        ids.push(product.id);
    });

    return ids;
}

function storeProducts(productCategory, categoryName, commandQueue) {
    productCategory.forEach(product => {
        commandQueue.hset(categoryName,
                         product.id,
                         JSON.stringify(product))
    });
    
    return commandQueue
}

async function queueDbCommands(productData, commandQueue){
    for(let i = 0; i < productData.length; ++i) {
        let productCategory = productData[i];
        let categoryName = PRODUCT_CATEGORIES[i];
        let ids = getProductIds(productCategory);
        commandQueue = storeProducts(productCategory, categoryName, commandQueue);
        commandQueue = await removeDeletedProducts(categoryName, ids, commandQueue);
        commandQueue = updatePreviousIds(categoryName, ids, commandQueue);
    }

    return commandQueue
};

async function main(){
    let commandQueue;
    try {
        commandQueue = redisClient.multi();
        let productData = await composeData();
        commandQueue = await queueDbCommands(productData, commandQueue);
    } catch (error) {
        console.error(error);
        redisClient.quit();
        // In this case do something in the scheduler
        process.exit(1);
    }
    

    commandQueue.exec(function (error, results) {
        if(error) {
            console.error(error);
            redisClient.quit();
            // In this case do something in the scheduler
            process.exit(1);
        }
        redisClient.quit();
        process.exit(0);

    })
}

main();