require('dotenv').config()

const express = require('express');
const app = express();
const redis = require('redis');
const {DbUpdateScheduler} = require('./src/DbUpdateScheduler');

let update = new DbUpdateScheduler(100000, 30000);
update.spawnProcess();

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

app.get('/products/:productCategory', (req, res) => {
  let category = req.params.productCategory;
  redisClient.hgetall(category, (err, repl) => {
    if (err) throw err;
    console.log(repl)
    res.send(`<h1>${JSON.stringify(repl)}</h1>`)
  })
})

const port = 8080;

app.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`)
})