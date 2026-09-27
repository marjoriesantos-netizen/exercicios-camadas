const express = require('express');

const app = express();
app.use(express.json());

const productsModel = require('./models/products.model');

app.get('/products', (req, res) => res.status(200).json(productsModel.findAll()));

app.get('/products/:id', (req, res) => {
  const product = productsModel.findById(Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Produto nao encontrado' });
  return res.status(200).json(product);
});

app.post('/products', (req, res) => {
  const result = productsModel.create(req.body);
  if (result.error) return res.status(result.error.status).json({ error: result.error.message });
  return res.status(201).json(result.product);
});

app.use('/users', require('./routes/users.routes'));

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Exercicio 2 rodando em http://localhost:3000');
  });
}

module.exports = app;
