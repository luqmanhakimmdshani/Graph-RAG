# Graph RAG Capstone: Project Context

A complete, self-contained description of the Graph RAG capstone project: what it is, how it works, what was built, how it was evaluated, what went wrong along the way, and its limits. Written as a source document for NotebookLM (study guide, audio overview, Q&A practice for the capstone defense). All figures are from the live system as of 23 September 2026.

---

## 1. The project in one paragraph

Graph RAG is a question-answering system over 500 tech and business news articles (17–29 November 2023). Instead of only searching for passages whose wording resembles the question, which is how standard "RAG" (retrieval-augmented generation) works, it first turns the articles into a **knowledge graph**: a map of people, companies and products and the relationships between them (who founded, invested in, acquired, partnered with, competes with, or works at what). To answer a question it starts from the names in the question and **follows the connections**, so it can join facts that were reported in different articles. It is compared head-to-head with a standard RAG baseline built on the same articles and the same AI model. On a 20-question benchmark, Graph RAG scored **4.95 out of 5** for relevance against **2.40** for standard RAG: more than twice as relevant.

## 2. The problem it solves

### How standard RAG works
1. **Split**: every article is cut into passages of about 500 words (with a 75-word overlap).
2. **Fingerprint**: each passage is turned into an embedding, a list of numbers capturing its meaning (model: `all-MiniLM-L6-v2`, run locally).
3. **Search**: the question is embedded the same way, and the 5 passages with the most similar fingerprints are retrieved.
4. **Answer**: an AI model writes the answer using only those 5 passages.

### Where standard RAG fails
- **Multi-hop questions**: the answer is spread across several articles. Example: *"Which two companies invested in Anthropic?"* Amazon's investment and Google's investment were reported in different articles. Standard RAG replied: *"The provided context does not contain information about which two companies invested in Anthropic."* Graph RAG replied: *"Amazon invested in Anthropic and Google invested in Anthropic,"* citing a source for each fact. (Both are real outputs from this system.)
- **Big-picture (global) questions**: e.g. *"What trends are visible in India's tech startup scene?"* No single passage holds the answer; it is a synthesis across the corpus, and standard RAG only ever sees 5 passages.

### Why a knowledge graph helps
The graph makes relationships explicit and walkable. A multi-hop question becomes a path through the graph instead of a similarity guess. For global questions, the graph is split into topic clusters that are summarized in advance, so a corpus-wide question can be answered from summaries of the whole collection.

## 3. The data

| Item | Value |
|---|---|
| Articles | 500 news articles |
| Outlets | 23 (largest: Forbes 100, The Times of India 100, Business Insider 56, BBC News 54, International Business Times 30, Digital Trends 18) |
| Date range | 17–29 November 2023 (11 distinct days) |
| Passages (chunks) indexed | 1,254 |
| Entities in the graph | 4,003 (1,632 organisations, 1,490 people, 881 products) |
| Relationships | 1,599 |
| Relationship types | 6: works at / employed by (823), founded (267), competes with (171), partnered with (157), invested in (109), acquired (72) |
| Topic groups used for global questions | 150 (communities with 3 or more members, each with an AI-written summary) |
| Most connected entities | OpenAI (73 links), Microsoft (43), Google (36), Amazon (32), Royal Challengers Bangalore (31), Mumbai Indians (29), Gujarat Titans (26), Apple (21) |

The corpus window is the week of the OpenAI leadership crisis (November 2023), which is why OpenAI is the most connected entity. The corpus also contains Indian Premier League cricket teams, Indian startups and venture capital, and entertainment and streaming news.

## 4. How the system works

### Building the graph (done once per batch of articles)
1. **Read and chunk** each article into ~500-word passages.
2. **Embed** each passage and store it in a vector database (ChromaDB). This serves the standard RAG baseline.
3. **Extract** entities and relationships from every passage with an AI model in structured JSON mode. Entities are typed PERSON, ORG or PRODUCT; relationships are one of the 6 types, each with a confidence score from 0 to 1 and a pointer to the source passage and article.
4. **Resolve entities**: names are normalized (lowercase, punctuation and legal suffixes like "Inc." removed), and then two rule-based merges run:
   - *Spelling variants* of the same type: "Space X" / "SpaceX", "Paramount+" / "Paramount Plus", "The Associated Press" / "Associated Press".
   - *Bare surnames* that match exactly one full name and are not anyone's first name: "Zuckerberg" becomes "Mark Zuckerberg". "Isaac" is deliberately skipped because it is both "Mia Isaac"'s surname and "Isaac Oyedepo"'s first name.
   - 80 duplicate nodes were merged this way (4,083 to 4,003 entities). Merged names are kept as aliases, so a question mentioning "Space X" still finds SpaceX, and future articles mentioning "Space X" attach to the existing node.
   - Naive merging was rejected after checking the real data: "merge anything that shares a word" would wrongly merge Google with Google DeepMind, BBC with BBC News, and Max with HBO Max.
5. **Write the graph** into Neo4j (AuraDB Free, cloud-hosted).
6. **Detect communities** with the Louvain algorithm (networkx, run in the backend because AuraDB Free lacks Neo4j's graph data science plugin), then have the AI summarize each community of 3+ members. Summaries are matched to clusters by a fingerprint of their member set, so re-running clustering after the graph changes reuses summaries for unchanged clusters (140 of 150 were reused after the entity merge; only 10 needed new AI calls).

### Answering a question (every question, a few seconds)
1. **Entity linking**: known entity names and aliases are matched in the question text.
2. **Graph traversal**: from each matched entity, the graph is walked outward (default 2 hops; configurable 1–4).
3. **Confidence filter and ranking**: facts the extraction AI rated below 0.5 confidence are dropped (13 of 1,622 edges at the time), and facts are ordered direct-connections-first, then by confidence.
4. **Answer**: up to 60 facts, each with its source article, are given to the AI, which answers using only those facts and cites them.
5. **Global fallback**: if the question names no known entity, or no connecting facts are found, the system answers from the 150 topic summaries instead. The interface labels which path was used ("Answered from connected facts" or "Answered from topic summaries").

## 5. Technology stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript, Tailwind CSS v4 |
| 3D graph views | `3d-force-graph` (three.js) with a bloom glow effect |
| Backend | Python, FastAPI |
| Graph database | Neo4j AuraDB Free |
| Vector database | ChromaDB (local, embedded) |
| Embeddings | `sentence-transformers` `all-MiniLM-L6-v2`, run locally (no API cost) |
| Community detection | networkx + Louvain |
| AI models | Switchable provider layer (see section 7) |
| Testing | pytest (12 tests) |

## 6. The application (what the audience sees)

- **Landing page**: a live 3D rendering of the project's own code graph (450 nodes), the logo, and links to the app sections, plus a "live / offline" server indicator.
- **Dashboard**: plain-language statistics: key numbers, the benchmark result by question type, the split between people, organisations and products, the kinds of connection, the most connected names, and news sources. Chart colours were checked with a colour-blindness validator.
- **Chat**: a conversation view. It offers four known-good example questions, explains the wait while it works, shows each answer with its sources and which path was used, and has a "Show how this answer was found" toggle that reveals the 3D subgraph used.
- **Compare**: the same question through standard RAG and Graph RAG side by side, with a dropdown of the 20 benchmark questions.
- **Explorer**: search any entity and fly through its connections in 3D; clicking a node or a neighbour expands the graph in place and puts that name in the search bar.
- **Admin**: upload new articles as .txt, .json, .pdf or .docx; bad files or items are skipped with a reason instead of breaking the upload.
- **Eval**: run the benchmark and view per-question scores.

## 7. The AI provider layer

The system calls AI models for three jobs: extracting entities and relationships, writing answers, and judging answers in the evaluation. It can switch providers with one setting:
- **Gemini** (Google): the original provider. Its free tier ran out of quota during the project.
- **Ollama** (local model, `llama3.2:3b`): tried as an offline fallback and rejected. Its default 2,048-token context silently cut long prompts (a global question's prompt is about 12,000 tokens), and a larger context did not fit the 4 GB GPU within the 20-second response budget.
- **Any OpenAI-compatible endpoint**: currently an OmniRoute combo called `rag-free`, served mostly by Groq's `gpt-oss-120b`, falling back to OpenRouter for prompts too large for Groq's 8,000-tokens-per-minute free limit.

For the evaluation, the judge is **pinned** to a single model (NVIDIA `nemotron-3-super-120b`) so that every question in a run is scored by the same judge, and by a different model family from the one writing the answers.

## 8. Evaluation

### Method
- 20 benchmark questions with reference answers, written from the actual corpus: 8 local (single fact), 8 multi-hop (connected facts), 4 global (big picture).
- Every question is answered by both systems, which use the same articles and the same answering AI; only retrieval differs.
- An AI judge scores each answer from 0 to 5 for **relevance** (does it answer the question and match the reference?) and **faithfulness** (is it grounded, not invented?).
- If a pipeline fails (for example a timeout), the answer scores 0 and the error is recorded, rather than an empty answer being judged. (An earlier version let a weak judge score an empty answer 4–5; this was found and fixed.)

### Results (current run: 20 of 20 questions, 0 errors)

| Question type | Graph RAG relevance | Standard RAG relevance | Graph RAG faithfulness | Standard RAG faithfulness |
|---|---|---|---|---|
| **Overall (20)** | **4.95** | **2.40** | 4.80 | 4.80 |
| Simple facts (8) | 5.00 | 2.50 | 5.00 | 5.00 |
| Connected facts (8) | 5.00 | 2.38 | 4.50 | 5.00 |
| Big-picture (4) | 4.75 | 2.25 | 5.00 | 4.00 |

The earlier baseline run with Gemini as both writer and judge showed the same pattern: 4.90 against 1.65 relevance overall.

### How to read the results
- Graph RAG is **more than twice as relevant** overall and wins in every category.
- Both systems are equally faithful (4.80). The difference is in *finding* the answer, not in making things up.
- Standard RAG's faithfulness is high partly because it often says "the context does not contain this", which is honest but not helpful.
- Small differences between runs are not meaningful, because the judge model changed between runs.

## 9. Engineering work and problems solved

The project went through a structured audit (23 gaps found) fixed in four tiers:
- **Tier 1**: stale documentation, safety limits, error handling, timeouts.
- **Tier 2**: long jobs (ingestion, evaluation) moved to background tasks. A real bug was found here: the first version froze the whole server during an evaluation run, because a blocking `sleep` inside an async function blocks the entire event loop. It was caught by a live test with concurrent requests.
- **Tier 3**: automatic routing between graph and global answers, the Chat page switched to Graph RAG, re-uploading the same article no longer creates duplicates, per-document upload status, and configurable hop depth.
- **Tier 4**: entity resolution (80 merges), confidence scores used for ranking and filtering, and the automated test suite.

Other notable problems found and fixed:
- **Community summaries pinned to the wrong clusters**: clustering renumbers groups whenever the graph changes, so summaries keyed by group number would have described different clusters after the merge. They are now keyed by a fingerprint of the member set.
- **The server silently running old code**: the development server's auto-reload never picked up changes on the Windows machine, so the live app ran morning code all day. Chat failed with "Graph RAG query failed" because the old code still called Gemini after its quota was spent. The fix was a manual restart; the lesson is to confirm the running server has the new code.
- **Uploads**: a JSON item missing its text used to crash the whole batch; now it is skipped with a reason. PDF and Word support was added.
- **Interface bugs from CSS layering**: button text appeared white on lime and hover effects never showed, because some base styles sat outside Tailwind's CSS layers and silently overrode component styles. They were moved into the base layer.
- **Answer formatting**: AI answers were stripped of markdown symbols (`*`, `#`) and odd citation brackets (`【13】` normalized to `[13]`) that showed up literally in the plain-text interface.

## 10. Limitations (said honestly)

- **Only six kinds of connection.** The graph knows "founded" or "invested in", but not reasons, events, dates or amounts. *"Why was Sam Altman fired?"* is out of reach, and standard RAG can handle some such questions better.
- **Small test set, AI-judged.** 20 questions, scored by an AI judge rather than people.
- **Two weeks of news.** Everything comes from 17–29 November 2023.
- **Needs an online AI provider** to extract and answer; the local model was too weak on the available hardware.
- **Entity linking ignores case**, so a question starting "Who…" also matches the organisation "WHO" (World Health Organization). This usually just adds a few irrelevant facts.
- **Citation numbers** like [13] refer to the 13th fact given to the AI, not the 13th source listed, which can confuse viewers.
- **Not hosted online** yet; it runs locally for the demo.

## 11. Future work

- Richer connections: events, dates and amounts, not only who is linked.
- A bigger benchmark with hundreds of questions, checked by people.
- Live news ingestion to keep the graph current.
- Online hosting (planned: frontend on Vercel, backend on a host with a persistent disk such as Hugging Face Spaces, since Vercel cannot run the ML libraries, the local vector store, or long background jobs).
- Linking citation numbers to the exact source article.

## 12. Demo script (for the defense)

1. **Dashboard**: the numbers at a glance.
2. **Chat**: click "Which AI research lab did Google acquire?" (answer: DeepMind), then open "Show how this answer was found".
3. **Compare**: ask "Which two companies invested in Anthropic?" Standard RAG finds nothing; Graph RAG answers Amazon and Google.
4. **Explorer**: search OpenAI and expand a neighbour.

Before presenting: start the backend server by hand (auto-reload is unreliable on this machine), open the app once so the AI is warmed up, and check that the landing page shows "live".

## 13. Glossary

- **RAG (retrieval-augmented generation)**: look up relevant material first, then have an AI write the answer from it.
- **Embedding / meaning fingerprint**: a list of numbers representing what a passage is about; similar meanings give similar numbers.
- **Vector database**: stores embeddings and finds the most similar ones quickly (ChromaDB here).
- **Knowledge graph**: a network of entities (nodes) and relationships (edges).
- **Entity**: a person, organisation or product.
- **Multi-hop question**: one whose answer requires chaining two or more facts.
- **Entity resolution**: recognising that different names refer to the same thing.
- **Community detection (Louvain)**: an algorithm that finds densely connected groups in a graph.
- **LLM-as-judge**: using an AI model to score answers against reference answers.
- **Relevance / faithfulness**: whether an answer addresses the question and matches the reference / whether it sticks to real information.
- **Hop**: one step along a relationship in the graph.

## 14. Likely panel questions, with answers

- **Why not just use a bigger AI model with the whole corpus in its context?** 500 articles are far beyond most context windows, it would be slow and costly per question, and the answer would not show which connections it used. The graph makes the reasoning inspectable.
- **Isn't the AI judge biased?** Possibly. It is mitigated by pinning one judge for a whole run, using a different model family from the answer writer, and scoring against written reference answers. The limitation is acknowledged: a larger human-scored benchmark is future work.
- **Is the comparison fair?** Yes: same articles, same answering AI, same questions. Only retrieval differs.
- **What happens with a question the graph can't answer?** If no known names are found, it falls back to topic summaries. If the information isn't in the graph at all, the AI is instructed to say so rather than guess, and the faithfulness scores (4.8/5) support that it does.
- **How do you stop the AI making things up?** Every prompt instructs it to answer only from the provided facts or passages and to cite them; answers show their sources; faithfulness is measured in the evaluation.
- **How were duplicate entities handled?** Rule-based resolution that was checked against the real data before being applied (see section 4); 80 duplicates merged, with aliases kept for lookups.
- **What was the hardest problem?** Candidates: the free AI quota running out mid-project (solved with a switchable provider layer); the server freezing during evaluation (a blocking call inside async code); the local model silently truncating prompts.
- **Why "Multi-vector retrieval" on the landing page?** It refers to the system's two retrieval paths: vector search (standard RAG) and graph traversal. It does not use multi-vector embeddings in the ColBERT sense.
