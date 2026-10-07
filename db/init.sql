CREATE TABLE questions (
    id serial PRIMARY KEY,
    text text NOT NULL CHECK (length(text) BETWEEN 1 AND 280),
    votes integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO questions (text, votes) VALUES
    ('Hur lång tid tar det att driftsätta ett projekt?', 1);
