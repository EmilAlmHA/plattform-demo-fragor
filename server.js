// A question box for the audience, used as the live demo of the student
// platform. Plain Node plus the pg package. pg reads PGHOST, PGUSER,
// PGPASSWORD and PGDATABASE from the environment, which the platform sets
// when the project has a database.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool();
const page = fs.readFileSync(path.join(__dirname, "public", "index.html"));

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 10000) throw new Error("too large");
  }
  return body;
}

async function handle(req, res) {
  // The platform strips /<project> before the request arrives, so the app
  // only sees its own paths.
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }

  if (req.method === "GET" && url.pathname === "/api/questions") {
    const { rows } = await pool.query(
      "SELECT id, text, votes, created_at FROM questions ORDER BY votes DESC, id DESC LIMIT 100"
    );
    return json(res, 200, rows);
  }

  if (req.method === "POST" && url.pathname === "/api/questions") {
    const { text } = JSON.parse((await readBody(req)) || "{}");
    const clean = String(text || "").trim().slice(0, 280);
    if (!clean) return json(res, 400, { error: "Skriv en fråga först." });
    const { rows } = await pool.query("INSERT INTO questions (text) VALUES ($1) RETURNING id", [clean]);
    return json(res, 201, { id: rows[0].id });
  }

  const vote = url.pathname.match(/^\/api\/questions\/(\d+)\/vote$/);
  if (req.method === "POST" && vote) {
    await pool.query("UPDATE questions SET votes = votes + 1 WHERE id = $1", [Number(vote[1])]);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: "Finns inte." });
}

http
  .createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      json(res, 500, { error: "Något gick fel på servern." });
    });
  })
  .listen(process.env.PORT || 3000, process.env.HOST || "0.0.0.0", () => {
    console.log(`Frågelådan lyssnar på port ${process.env.PORT || 3000}`);
  });
