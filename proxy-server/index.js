require('dotenv').config()

const express = require('express');
const app = express();
const redis = require('redis');
const { fork } = require('child_process');

const child = fork(__dirname + "/src/composeData");
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});

redisClient.set('test', 'value')

app.get('/products', (req, res) => {
  redisClient.get('test', (err, repl) => {
    if (err) throw err;

    res.send(`<h1>${repl}</h1>`)
  })
})

const port = 8080;

app.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`)
})