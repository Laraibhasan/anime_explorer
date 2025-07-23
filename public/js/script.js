let currentPage = 1;
let currentGenre = '';
let loading = false;

function showModal(anime) {
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = `
    <h2>${anime.title}</h2>
    <p><strong>Episodes:</strong> ${anime.episodes}</p>
    <p><strong>Score:</strong> ${anime.score}</p>
    <p><strong>Synopsis:</strong> ${anime.synopsis}</p>
  `;
  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

window.onclick = function (event) {
  const modal = document.getElementById('modal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

function bindCardEvents() {
  const cards = document.querySelectorAll('.anime-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const anime = {
        title: card.dataset.title,
        episodes: card.dataset.episodes,
        score: card.dataset.score,
        synopsis: card.dataset.synopsis
      };
      showModal(anime);
    });
  });
}

function createCard(anime) {
  const card = document.createElement('div');
  card.className = 'anime-card';
  card.dataset.title = anime.title;
  card.dataset.episodes = anime.episodes || 'N/A';
  card.dataset.score = anime.score || 'N/A';
  card.dataset.synopsis = anime.synopsis || 'No synopsis available.';

  card.innerHTML = `
    <img src="${anime.images.jpg.image_url}" alt="${anime.title}">
    <div class="anime-info">
      <h3>${anime.title}</h3>
      <p>Score: ${anime.score || 'N/A'}</p>
      <p>Episodes: ${anime.episodes || 'N/A'}</p>
    </div>
  `;
  return card;
}

function loadMoreAnime() {
  if (loading) return;
  loading = true;
  currentPage++;

  const url = currentGenre
    ? `/genre?genre=${currentGenre}&page=${currentPage}`
    : `/?page=${currentPage}`;

  fetch(url, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('animeList');
      data.animeList.forEach(anime => {
        container.appendChild(createCard(anime));
      });
      bindCardEvents();
      loading = false;
    })
    .catch(err => {
      console.error('Failed to load more anime:', err);
      loading = false;
    });
}

function filterByGenre(genreId) {
  currentGenre = genreId;
  currentPage = 1;

  fetch(`/genre?genre=${genreId}&page=1`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' }
  })
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('animeList');
      container.innerHTML = '';
      data.animeList.forEach(anime => {
        container.appendChild(createCard(anime));
      });
      bindCardEvents();
    })
    .catch(err => {
      console.error('Failed to filter by genre:', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  bindCardEvents();

  const genreSelect = document.getElementById('genreSelect');
  genreSelect.addEventListener('change', () => {
    console.log('Genre changed to:', genreSelect.value); 
    const selected = genreSelect.value;
    if (selected) {
      filterByGenre(selected);
    } else {
      // If reset to blank, reload original top list
      window.location.href = '/';
    }
  });

  document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreAnime);
});
