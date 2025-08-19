import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;

env.config();

// ---------- MongoDB connection ----------
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsInsecure: true, // disable certificate validation for dev/testing only
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// ---------- Define Schemas & Models ----------
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  provider: { type: String, default: "local" }
});

const favoriteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  anime_id: { type: String, required: true }
}, { indexes: [{ unique: true, fields: ['user_id', 'anime_id'] }] });

const User = mongoose.model("User", userSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);

// ---------- Middleware ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: false,
      httpOnly: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- Passport Local Strategy ----------
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.trim() });
        if (!user) return done(null, false, { message: "User not found" });

        const valid = await bcrypt.compare(password.trim(), user.password);
        if (!valid) return done(null, false, { message: "Incorrect password" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ---------- Passport Google Strategy ----------
passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://anime-explorer.onrender.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.email });
        if (!user) {
          user = await User.create({
            email: profile.email,
            password: "google", // Not used for OAuth users
            provider: "google"
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ---------- Passport Session ----------
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ---------- Helper ----------
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchAnime(id, retries = 3) {
  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    if (!response.ok) throw new Error("Bad response");
    const data = await response.json();
    return data.data || null;
  } catch (err) {
    if (retries > 0) {
      await delay(1000);
      return fetchAnime(id, retries - 1);
    }
    return null;
  }
}

// ---------- Routes ----------
app.get("/", async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  try {
    // Fetch top anime
    const { data } = await axios.get(`https://api.jikan.moe/v4/top/anime?page=${page}`);
    let animeList = data.data;

    let favorites = [];
    if (req.isAuthenticated()) {
      const favDocs = await Favorite.find({ user_id: req.user._id });
      favorites = favDocs.map(f => f.anime_id);
    }

    animeList = animeList.map(anime => ({
      ...anime,
      isFavorited: favorites.includes(String(anime.mal_id)),
    }));

    if (req.get("X-Requested-With") === "XMLHttpRequest") {
      return res.json({ animeList, page });
    }
    res.render("index", { animeList, page, user: req.user || null });

  } catch (err) {
    res.status(500).send("Failed to fetch anime data");
  }
});

app.get("/login", (req, res) => {
  const showError = req.query.error;
  res.render("login", { error: showError });
});

app.get("/signup", (req, res) => res.render("signup"));

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login?error=1",
    successRedirect: "/",
  })
);

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.redirect("/login");

    const hash = await bcrypt.hash(password.trim(), saltRounds);
    const user = await User.create({ email: email.trim(), password: hash });
    req.login(user, err => {
      if (err) console.error(err);
      res.redirect("/");
    });
  } catch (err) {
    console.error(err);
    res.redirect("/signup?error=1");
  }
});

app.get("/favorites", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  try {
    const favDocs = await Favorite.find({ user_id: req.user._id });
    const favoriteIds = favDocs.map(r => r.anime_id);

    const animeList = [];
    for (const id of favoriteIds) {
      const anime = await fetchAnime(id);
      if (anime) animeList.push(anime);
      await delay(350);
    }

    if (req.get("X-Requested-With") === "XMLHttpRequest") {
      return res.json({ animeList });
    }
    res.render("favorites", { animeList, user: req.user });
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(err => {
      if (err) return next(err);
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => res.redirect("/")
);

app.post("/favorites/add", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });

  const userId = req.user._id;
  const animeId = req.body.animeId;
  try {
    await Favorite.updateOne(
      { user_id: userId, anime_id: animeId },
      { $setOnInsert: { user_id: userId, anime_id: animeId } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/favorites/remove", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not logged in" });
  const userId = req.user._id;
  const animeId = req.body.animeId;
  try {
    await Favorite.deleteOne({ user_id: userId, anime_id: animeId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.redirect("/");
  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`);
    res.render("index", { animeList: response.data.data, user: req.user });
  } catch {
    res.status(500).send("Failed to search anime");
  }
});

app.get("/genre", async (req, res) => {
  const genreId = req.query.genre;
  const page = parseInt(req.query.page) || 1;
  if (!genreId) return res.json({ animeList: [] });
  try {
    const response = await axios.get(
      `https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}`
    );
    res.json({ animeList: response.data.data });
  } catch {
    res.status(500).json({ error: "Failed to fetch anime by genre" });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
