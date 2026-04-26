const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const port = 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get data
app.get('/api/data', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    // If file doesn't exist, return empty object
    res.json({});
  }
});

// Update data
app.post('/api/data', async (req, res) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Dados salvos com sucesso' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

app.listen(port, () => {
  console.log(`
🚀 Servidor Profissional RDO rodando!
-------------------------------------
Local: http://localhost:${port}
-------------------------------------
  `);
});
