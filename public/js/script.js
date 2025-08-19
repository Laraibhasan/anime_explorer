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

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

const hamburger = document.getElementById("hamburger");
const menu = document.getElementById("menu");

// toggle menu on hamburger click
document.body.addEventListener("click", function(e){
  const hamburger = document.getElementById("hamburger");
  if (hamburger && e.target === hamburger) {
    e.stopPropagation();
    menu.classList.toggle("active");
  }
});

// close the menu when clicking any link/item inside it
if (menu) {
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A" || e.target.tagName === "LI") {
      menu.classList.remove("active");
    }
  });
}

function bindCardEvents() {
  const cards = document.querySelectorAll('.anime-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Ignore clicks on the favorites button
      if (e.target.classList.contains('favorite-btn')) return;

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
  const card = document.createElement("div");
  card.className = "anime-card";
  card.dataset.title = anime.title;
  card.dataset.episodes = anime.episodes || "N/A";
  card.dataset.score = anime.score || "N/A";
  card.dataset.synopsis = anime.synopsis || "No synopsis available.";

  const isFavorited = !!anime.isFavorited;

  card.innerHTML = `
    <div class="anime-card-content">
      <img src="${anime.images.jpg.image_url}" alt="${anime.title}"/>
      <div class="anime-info">
        <h3>${anime.title}</h3>
        <p>Score: ${anime.score || "N/A"}</p>
        <p>Episodes: ${anime.episodes || "N/A"}</p>
      </div>
    </div>
    <div class="anime-card-footer">
      <button 
        class="favorite-btn ${isFavorited ? "favorited" : ""}" 
        data-id="${anime.mal_id}">
        ${isFavorited ? "Added to Favorites" : "Add to Favorites"}
      </button>
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

  fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('animeList');
      data.animeList.forEach(anime => {
        container.appendChild(createCard(anime));
      });
      bindCardEvents();
      bindFavoriteEvents(); // bind new buttons too
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
      bindFavoriteEvents();
    })
    .catch(err => {
      console.error('Failed to filter by genre:', err);
    });
}

// FAVORITES BUTTON HANDLER
function bindFavoriteEvents() {
  const container = document.getElementById("animeList");
  if (!container) return; // no anime list on this page

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest(".favorite-btn");
    if (!btn) return;

    e.stopPropagation();

    if (!window.isLoggedIn || window.isLoggedIn === 'false') {
      // If user not logged in, set localStorage flag and reload page on 'pageshow' event
      window.addEventListener('pageshow', (event) => {
        if (localStorage.getItem('favoritesChanged') === 'true' || event.persisted) {
          localStorage.removeItem('favoritesChanged');
          window.location.href = "/login";
        }
      });
      localStorage.setItem('favoritesChanged', 'true');
      window.location.href = "/login";
      return;
    }

    // User is logged in, proceed with toggle
    const animeId = btn.dataset.id;
    const isCurrentlyFavorited = btn.classList.contains("favorited");
    const url = isCurrentlyFavorited ? "/favorites/remove" : "/favorites/add";

    btn.disabled = true;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Favorite toggle failed:", err.error || res.statusText);
        return;
      }

      if (isCurrentlyFavorited) {
        btn.classList.remove("favorited");
        btn.textContent = "Add to Favorites";

        if (window.location.pathname === "/favorites") {
          const card = btn.closest(".anime-card");
          if (card) {
            card.remove();
            localStorage.setItem("favoritesChanged", "true");
          }
        }
      } else {
        btn.classList.add("favorited");
        btn.textContent = "Added to Favorites";
      }
    } catch (err) {
      console.error("Request error:", err);
    } finally {
      btn.disabled = false;
    }
  });
}


document.addEventListener('DOMContentLoaded', () => {
  bindCardEvents();
  bindFavoriteEvents();

  const genreSelect = document.getElementById('genreSelect');
  if (genreSelect){
    genreSelect.addEventListener('change', () => {
      const selected = genreSelect.value;
      if (selected) {
        filterByGenre(selected);
      } else {
        window.location.href = '/';
      }
    });
  }

  document.getElementById('loadMoreBtn')?.addEventListener('click', loadMoreAnime);

  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');
  if (hamburger && menu) {
    hamburger.addEventListener('click', () => {
      menu.classList.toggle('show');
    });
  }
});
