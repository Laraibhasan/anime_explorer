🎌 Anime Explorer

Anime Explorer is a Netflix-style anime discovery website built with Node.js, Express, EJS, and MongoDB.
It lets users search anime (via Jikan API), log in, manage favorites, and sign in with Google.

👉 **Live Demo:** [Anime Explorer](https://anime-explorer.onrender.com/)  

🚀 Features

🔍 Search & Explore: Find anime using Jikan API

❤️ Favorites: Add / remove anime from your personal list.

👤 Authentication:

- Email & password login/signup

- Google OAuth integration

🖥️ Responsive UI: Netflix-inspired grid layout with card hover effects.

🛡️ Secure: Passwords hashed with bcrypt, sessions with Passport.js.

🛠️ Tech Stack

- Frontend

- EJS Templates

- CSS3 / Flexbox / Grid

- Vanilla JavaScript

- Backend

- Node.js + Express.js

- Passport.js (Local + Google OAuth)

- PostgreSQL (Favorites & User Data)

- Jikan API (Anime data)

📂 Project Structure
├── public/          # Static assets (CSS, JS, images)
│   ├── css/
│   └── js/
├── views/           # EJS templates
│   ├── index.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   ├── favorites.ejs
├── server.js        # Main Express server
├── routes/          # App routes
├── models/          # DB schemas (if using Sequelize/pg)
└── README.md

🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

📜 License

MIT License © 2025 Laraib Hasan
