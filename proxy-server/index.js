require('dotenv').config()

const express = require('express')
const port = 8080;

const app = express()
const redis = require('redis');

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS 
});
client.set('test', 'value')

client.on('error', err => {
    console.log('Error ' + err);
});

app.get('/products', (req, res) => {
  client.get('test', (err, repl) => {
    if (err) throw err;

    res.send(`<h1>${repl}</h1>`)
  })
})

app.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`)
})