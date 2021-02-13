/* Summary : A script that handles storing the product data into the Redis database.
 *
 * Description: Each product category has it's own hash in the database. Products are
 * stored as fields of that hash where the product id is the key and the value is the
 * product object serialized as a JSON string.
 * 
 * The database commands are all executed as once as a Redis multi command. This makes
 * each database update an atomic event. This makes it so that the API doesn't ever
 * return partially updated data.
*/

const {composeData} = require('./composeData')
const redis = require('redis');
const PRODUCT_CATEGORIES = require('./constants').PRODUCT_CATEGORIES;
const {promisify} = require('util');

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS
});

const hkeysAsync = promisify(redisClient.hkeys).bind(redisClient);

function removeDeletedProducts(category, prevIds, newIds, commandQueue) {
    let prevSet = new Set(prevIds);
    let newSet = new Set(newIds);

    // Set difference (prevSet / newSet)
    let deletedIds = new Set([...prevSet].filter(id => !newSet.has(id)));

    deletedIds.forEach((id) => {
        commandQueue.hdel(category, id);
    });

    return commandQueue;
}

function storeProducts(productsOfCategory, categoryName, commandQueue) {
    productsOfCategory.forEach(product => {
        commandQueue.hset(categoryName,
                         product.id,
                         JSON.stringify(product))
    });
    
    return commandQueue
}

async function queueDbCommands(productData, commandQueue){
    for(let i = 0; i < productData.length; ++i) {
        let productsOfCategory = productData[i];
        let categoryName = PRODUCT_CATEGORIES[i];
        let newIds = productsOfCategory.map(product => product.id);
        let prevIds = await hkeysAsync(categoryName);
        commandQueue = storeProducts(productsOfCategory, categoryName, commandQueue);
        commandQueue = removeDeletedProducts(categoryName, prevIds, newIds, commandQueue);
    }

    return commandQueue
};

async function main(){
    let commandQueue = redisClient.multi();
    try {
        let productData = await composeData();

        commandQueue = await queueDbCommands(productData, commandQueue);
        const executeCommands = promisify(commandQueue.exec).bind(commandQueue);
        await executeCommands();
    } catch (error) {
        console.error(error);
        redisClient.quit();
        process.exit(1);
    }

    redisClient.quit();
    process.exit(0);
}

main();