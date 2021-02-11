require('dotenv').config();

const express = require('express');
const app = express();
const redis = require('redis');
const cors = require('cors');

app.use(cors());

const DbUpdateScheduler = require('./src/DbUpdateScheduler');

DbUpdateScheduler.spawnProcess();

const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASS
});

// JSON.stringify doesn't work correctly on a list of already stringified
// JSON objects, therefore this is required. (Products are stored as
// stringified JSON objects in the Redis database.)
function jsonStringify(redisReply){
  let response = '['
    redisReply.forEach((r, i) => {
      if(i === redisReply.length - 1){
        response = response.concat(`${r}]`);
      } else {
        response = response.concat(`${r}, `);
      }
  })
  return response;
}

app.get('/products/:productCategory', (req, res) => {
  let category = req.params.productCategory;
  redisClient.hvals(category, (err, repl) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: err });
    } else {
      if (repl.length) {
        let response = jsonStringify(repl);
        res.setHeader('Content-Type', 'application/json')
        res.send(response);
      } else {
        res.status(404)
        res.send({ message: 'Not found' });
      }
    }
  });
})

const port = 8080;

app.listen(port, () => {
  console.log(`Proxy server listening on http://localhost:${port}`)
})