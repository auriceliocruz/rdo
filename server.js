const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Middleware para parsing JSON
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Dados iniciais
let rdoData = {
  obra: "PV - Carrigaline",
  local: "Carrigaline",
  data: "2026-04-21",
  clima: "vento",
  equipe: [],
  obs: "",
  qualidade: {
    local: "bloco 1",
    lixaEscova: 11,
    galvanizado: 22,
    torqueLacre: 22,
    twitter: ""
  }
};

// Rota para obter dados
app.get('/api/data', (req, res) => {
  res.json(rdoData);
});

// Rota para atualizar dados
app.post('/api/data', (req, res) => {
  rdoData = { ...rdoData, ...req.body };
  res.json({ message: 'Dados atualizados com sucesso' });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});