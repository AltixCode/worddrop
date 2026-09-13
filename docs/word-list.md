# The word lists

Two separate lists, for two separate jobs.

## 1. Answers — `src/data/answers.source.tsv`

The curated daily words. One per line: `WORD<TAB>CATEGORY<TAB>CLUE`.

Rules, enforced by `scripts/build-answers.mjs` (the build fails, it does not
warn):

- 4–7 letters, A–Z only.
- No duplicates.
- A clue may not contain its own answer.
- At least 500 entries.

`node scripts/build-answers.mjs` compiles it into **both** artefacts that ship:

- `src/data/answers.ts` — the app's bundled copy, used for offline play
- `backend/src/answers.json` — the Worker's copy, used to publish each day

Both are generated from the one source precisely so the client's offline
fallback and the server's published puzzle cannot disagree. `backend/npm test`
compares them and fails if they differ.

### Topping the list up

At one puzzle a day, 547 entries last about eighteen months before the cycle
repeats. Add a new batch well before then:

1. Append rows to `answers.source.tsv`.
2. `node scripts/build-answers.mjs`
3. `cd backend && npm test` (parity), then commit both generated files.

**Appending changes the order of future puzzles**, because selection steps
through the list with a stride modulo its length. It never changes a day already
published — the Worker stores each day's puzzle in KV the first time it is
served, and that stored record is what players get.

### Content review before launch

Read the whole list for: offensive words, ambiguous entries, and clues that give
the answer away by accident. This is a human pass; nothing automates it.

## 2. Allowed guesses — `src/data/allowedGuesses.ts`

Generated from the system word list at `/usr/share/dict/words`, which on macOS
is `web2` — derived from Webster's Second International (1934) and in the public
domain. Only entirely lower-case, unaccented entries are kept, which drops
proper nouns.

```bash
node scripts/build-dictionary.mjs              # default /usr/share/dict/words
node scripts/build-dictionary.mjs /path/to/list
```

Stored as one concatenated string per length rather than 48,000 quoted strings —
same data, roughly a third of the bundle bytes. The lookup Set is built on the
first guess of a session, not at import time, so it never delays the first frame.

Every curated answer is added to the guessable set automatically, since a 1934
word list does not contain every modern film term.
