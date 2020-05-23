const express = require('express');
const router = express.Router();

const cart = [];

router.get('/', (req, res, next) => {
  res.send('Indeks koszyka');
  next();
})

router.get('/items', (req, res, next) => {
  // tutaj bylby odczyt z bazy
  res.send(cart);
  next();
});

router.post('/addItem', (req, res, next) => {
  // tutaj bylby zapis do bazy
  const newItem = req.body;
  console.log(req.body);
  if (!newItem.id || !newItem.name) {
    res.sendStatus(400);
  } else {
    cart.push(newItem);
  }
  res.end();
})

module.exports = router;
