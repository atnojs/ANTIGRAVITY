// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/proxy/:app', (req, res) => {
  proxyHandler(req, res);
});

async function proxyHandler(req, res) {
  const appName = req.params.app;
  let apiKey, apiUrl, headers, body;

  if (appName === 'flux') {
    const replicateKey = process.env.REPLICATE_API_FLUX;
    if (!replicateKey) {
      return res.status(500).json({ error: 'Replicate API key not found' });
    }
    apiUrl = 'https://api.replicate.com/v1/models/black-forest-labs/flux-2-pro/predictions';
    headers = {
      'Authorization': `Bearer ${replicateKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    };
    body = req.body;
  } else {
    const apiKeyName = `GEMINI_KEY_${appName.toUpperCase()}`;
    apiKey = process.env[apiKeyName] || process.env.C;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not found' });
    }

    apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' + encodeURIComponent(apiKey);
    headers = {
      'Content-Type': 'application/json',
    };
    body = req.body;
  }

  try {
    const response = await axios.post(apiUrl, body, {
      headers,
    });
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.response ? error.response.data : error.message });
  }
}

app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
