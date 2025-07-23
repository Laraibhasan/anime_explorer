// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/top/anime?page=${page}`);
    const animeList = response.data.data;

    // Check if it's an AJAX request
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      res.json({ animeList });
    } else {
      res.render('index', { animeList, page });
    }
  } catch (error) {
    res.status(500).send('Failed to fetch anime data');
  }
});


app.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.redirect('/');

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`);
    const animeList = response.data.data;
    res.render('index', { animeList });
  } catch (error) {
    res.status(500).send('Failed to search anime');
  }
});

app.get('/genre', async (req, res) => {
  const genreId = req.query.genre;
  const page = parseInt(req.query.page) || 1;

  if (!genreId) return res.json({ animeList: [] });

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}`);
    const animeList = response.data.data;

    res.json({ animeList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anime by genre' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
