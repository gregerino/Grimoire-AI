var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/_handler.ts
var handler_exports = {};
__export(handler_exports, {
  default: () => handler_default
});
module.exports = __toCommonJS(handler_exports);
var import_express17 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// server/lib/sentry.ts
var Sentry = __toESM(require("@sentry/node"), 1);
function initServerSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.APP_VERSION || "0.1.0",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,
    beforeSend(event) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Sentry]", event.exception?.values?.[0]?.value);
        return null;
      }
      return event;
    }
  });
}

// server/routes/pdf.ts
var import_express = require("express");
var import_multer = __toESM(require("multer"), 1);

// server/lib/supabase-admin.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}
var supabaseAdmin = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey);

// server/services/chunker.ts
var import_textsplitters = require("@langchain/textsplitters");
var import_pdf_parse = require("pdf-parse");
async function parsePdfToChunks(buffer, filename) {
  const parser = new import_pdf_parse.PDFParse({ data: buffer });
  await parser.load();
  const { text, numpages } = await parser.getText();
  if (!text.trim()) {
    throw new Error("PDF contains no extractable text");
  }
  const splitter = new import_textsplitters.RecursiveCharacterTextSplitter({
    chunkSize: 1e3,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", ". ", " ", ""]
  });
  const docs = await splitter.createDocuments([text]);
  return docs.map((doc, i) => ({
    content: doc.pageContent,
    metadata: {
      page_start: 1,
      page_end: numpages,
      chunk_index: i,
      filename
    }
  }));
}

// server/services/embedder.ts
var import_openai = __toESM(require("openai"), 1);
var openai = new import_openai.default({ apiKey: process.env.OPENAI_API_KEY });
async function generateEmbeddings(texts) {
  const batchSize = 100;
  const allEmbeddings = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch
    });
    allEmbeddings.push(...response.data.map((d) => d.embedding));
  }
  return allEmbeddings;
}
async function embedAndStore(chunks, pdfId, campaignId) {
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);
  const rows = chunks.map((chunk, i) => ({
    pdf_id: pdfId,
    campaign_id: campaignId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata
  }));
  const insertBatchSize = 50;
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize);
    const { error } = await supabaseAdmin.from("document_chunks").insert(batch);
    if (error) {
      throw new Error(`Failed to insert chunks: ${error.message}`);
    }
  }
}
async function embedAndStoreRulebook(chunks, rulebookId, userId) {
  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);
  const rows = chunks.map((chunk, i) => ({
    rulebook_id: rulebookId,
    user_id: userId,
    content: chunk.content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: chunk.metadata
  }));
  const insertBatchSize = 50;
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize);
    const { error } = await supabaseAdmin.from("rulebook_chunks").insert(batch);
    if (error) {
      throw new Error(`Failed to insert rulebook chunks: ${error.message}`);
    }
  }
}

// server/routes/pdf.ts
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 400 * 1024 * 1024 },
  // 400MB for large rulebooks
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
var pdfRoutes = (0, import_express.Router)();
pdfRoutes.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        const msg = err instanceof import_multer.default.MulterError && err.code === "LIMIT_FILE_SIZE" ? "File too large (max 400MB)" : err.message || "Upload error";
        res.status(413).json({ error: msg });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file = req.file;
      const campaignId = req.body.campaign_id;
      const userId = req.body.user_id;
      if (!file || !campaignId || !userId) {
        res.status(400).json({ error: "Missing file, campaign_id, or user_id" });
        return;
      }
      const storagePath = `${userId}/${campaignId}/${Date.now()}-${file.originalname}`;
      let storageUploaded = false;
      const { error: storageError } = await supabaseAdmin.storage.from("pdfs").upload(storagePath, file.buffer, {
        contentType: "application/pdf"
      });
      if (storageError) {
        console.warn(`Storage upload skipped for ${file.originalname}: ${storageError.message}`);
      } else {
        storageUploaded = true;
      }
      const { data: pdfRecord, error: insertError } = await supabaseAdmin.from("pdfs").insert({
        user_id: userId,
        campaign_id: campaignId,
        filename: file.originalname,
        storage_path: storageUploaded ? storagePath : `local-only/${file.originalname}`,
        status: "processing"
      }).select().single();
      if (insertError || !pdfRecord) {
        res.status(500).json({ error: `DB insert failed: ${insertError?.message}` });
        return;
      }
      const msg = storageUploaded ? "Upload started, processing in background" : "File too large for storage \u2014 indexing directly (RAG will work, but PDF is not stored)";
      res.json({ pdf: pdfRecord, message: msg });
      processInBackground(pdfRecord.id, file.buffer, file.originalname, campaignId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
var lastProcessingError = null;
async function processInBackground(pdfId, buffer, filename, campaignId) {
  try {
    console.log(`Processing PDF: ${filename}`);
    const chunks = await parsePdfToChunks(buffer, filename);
    console.log(`Parsed ${chunks.length} chunks from ${filename}`);
    await embedAndStore(chunks, pdfId, campaignId);
    console.log(`Embedded and stored ${chunks.length} chunks for ${filename}`);
    lastProcessingError = null;
    await supabaseAdmin.from("pdfs").update({ status: "indexed" }).eq("id", pdfId);
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    lastProcessingError = message;
    console.error(`Failed to process PDF ${filename}:`, message);
    await supabaseAdmin.from("pdfs").update({ status: "error" }).eq("id", pdfId);
  }
}
pdfRoutes.get("/last-error", (_req, res) => {
  res.json({ error: lastProcessingError });
});
pdfRoutes.get("/list/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const { data, error } = await supabaseAdmin.from("pdfs").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ pdfs: data });
});
pdfRoutes.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { data: pdf, error: fetchError } = await supabaseAdmin.from("pdfs").select("storage_path").eq("id", id).single();
  if (fetchError || !pdf) {
    res.status(404).json({ error: "PDF not found" });
    return;
  }
  await supabaseAdmin.storage.from("pdfs").remove([pdf.storage_path]);
  const { error } = await supabaseAdmin.from("pdfs").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});

// server/routes/rag.ts
var import_express2 = require("express");
var import_openai2 = __toESM(require("openai"), 1);

// server/lib/retry.ts
var DEFAULT_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 1e4,
  timeoutMs: 3e4
};
function isRetryable(error) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) return true;
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    if (msg.includes("econnreset") || msg.includes("econnrefused")) return true;
    if (msg.includes("socket hang up")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    if (msg.includes("overloaded")) return true;
  }
  return false;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, opts = {}) {
  const { maxRetries, baseDelayMs, maxDelayMs, timeoutMs } = { ...DEFAULT_OPTIONS, ...opts };
  const shouldRetry = opts.retryOn ?? isRetryable;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs);
      return result;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      const jitter = Math.random() * 0.3 + 0.85;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt) * jitter);
      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms: ${error instanceof Error ? error.message : error}`);
      await sleep(delay);
    }
  }
  throw lastError;
}
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// server/routes/rag.ts
var openai2 = new import_openai2.default({ apiKey: process.env.OPENAI_API_KEY });
var ragRoutes = (0, import_express2.Router)();
ragRoutes.post("/search", async (req, res) => {
  try {
    const { query, campaign_id, user_id, match_count = 5 } = req.body;
    if (!query || !campaign_id && !user_id) {
      res.status(400).json({ error: "Missing query or campaign_id/user_id" });
      return;
    }
    const embeddingResponse = await withRetry(
      () => openai2.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      }),
      { maxRetries: 2, timeoutMs: 15e3 }
    );
    const queryEmbedding = embeddingResponse.data[0].embedding;
    let rpcName;
    let rpcParams;
    if (campaign_id && user_id) {
      rpcName = "match_documents_with_rulebooks";
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_user_id: user_id,
        match_count
      };
    } else if (campaign_id) {
      rpcName = "match_documents";
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_count
      };
    } else {
      rpcName = "match_rulebooks";
      rpcParams = {
        query_embedding: JSON.stringify(queryEmbedding),
        match_user_id: user_id,
        match_count
      };
    }
    const { data, error } = await supabaseAdmin.rpc(rpcName, rpcParams);
    if (error) {
      res.status(500).json({ error: `Search failed: ${error.message}` });
      return;
    }
    res.json({ results: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// server/routes/chat.ts
var import_express3 = require("express");
var import_crypto = __toESM(require("crypto"), 1);

// server/lib/ai-provider.ts
var import_sdk = __toESM(require("@anthropic-ai/sdk"), 1);
var import_openai3 = __toESM(require("openai"), 1);
var anthropic = new import_sdk.default({ apiKey: process.env.ANTHROPIC_API_KEY });
var openai3 = new import_openai3.default({ apiKey: process.env.OPENAI_API_KEY });
var ADMIN_USER_ID = process.env.ADMIN_USER_ID;
function resolveProvider(userId, campaignProvider = "claude") {
  if (!ADMIN_USER_ID || userId === ADMIN_USER_ID) return campaignProvider;
  return "openai";
}
async function createCompletion(opts) {
  if (opts.provider === "claude") {
    const result2 = await anthropic.messages.create({
      model: opts.model || "claude-sonnet-4-6",
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
      ...opts.system && { system: opts.system },
      messages: opts.messages
    });
    return result2.content[0].type === "text" ? result2.content[0].text : "";
  }
  const openaiMessages = [
    ...opts.system ? [{ role: "system", content: opts.system }] : [],
    ...opts.messages
  ];
  const result = await openai3.chat.completions.create({
    model: opts.model || "gpt-4o-mini",
    max_tokens: opts.maxTokens,
    temperature: opts.temperature,
    messages: openaiMessages
  });
  return result.choices[0]?.message?.content || "";
}

// server/prompts/dm-system.ts
var BASE_PROMPT = `You are the Dungeon Master of a solo D&D 5.5e campaign. You are not an AI assistant \u2014 you are the living world, the narrator, and every NPC the player encounters. Never break character. Never refer to yourself as an AI, a language model, or anything outside the fiction.

# Voice & Style
- Write in second person ("You step into the torchlit hall\u2026")
- Be vivid: use all five senses, vary sentence rhythm, build tension
- Voice every NPC distinctly \u2014 accent, vocabulary, mannerisms
- Use dramatic pacing: short sentences in combat, flowing prose in exploration
- Match the tone to the moment: grim in dungeons, warm in taverns, urgent in battle

# Rules Engine (D&D 5.5e)
- Apply the rules from the SOURCE MATERIAL when provided
- Roll dice transparently: state the roll, modifiers, DC, and result
- Use standard notation: "You swing your longsword \u2014 Attack: d20+5 = 18 vs AC 14. Hit! Damage: 1d8+3 = 7 slashing damage."
- Track initiative in combat, announce turn order
- Apply conditions, concentration, opportunity attacks, and death saves correctly
- If a rule is ambiguous, rule in favor of drama and fun, then note your interpretation

# Skill Checks (Player-Rolled)
The player rolls physical dice for skill checks. You should proactively call for checks when the fiction demands it \u2014 don't wait for the player to ask. Examples:
- The player says "I search the room" \u2192 ask for an Investigation check
- The player tries to lie to an NPC \u2192 ask for a Deception check
- The player approaches a dangerous ledge \u2192 ask for an Acrobatics or Athletics check
- An NPC is being evasive \u2192 ask for an Insight check
- The player enters a dark forest \u2192 ask for a Perception or Survival check
- The player attempts something physically demanding \u2192 ask for the appropriate STR/DEX/CON check

When YOU decide a check is needed during normal narrative, format your response exactly like a Step 1 response below (narrative setup + mechanical line). The player will then enter their roll result in the skill check input.

Messages tagged [Skill Check Request] and [Skill Check Result] follow a two-step flow:

## Step 1 \u2014 Request ([Skill Check Request: ...])
The player wants to attempt a skill check. Respond with TWO clearly separated parts:

**Narrative part** (read aloud via TTS): 1\u20132 sentences setting the scene. Keep it brief and atmospheric.

**Mechanical part** (NOT read aloud \u2014 written only): State the skill/ability required on a new line, e.g. "Make a Wisdom (Insight) check." Keep it to one sentence. Do NOT include instructions like "roll a d20" or "add your modifier" \u2014 the player knows how to roll.

NEVER reveal the DC. Keep it hidden internally.
Do NOT resolve the outcome. Do NOT roll for the player.

The speech block must ONLY contain the narrative sentences \u2014 never the mechanical instruction.

## Step 2 \u2014 Result ([Skill Check Result: N])
The player rolled their physical dice and reports the number.
- Apply modifiers from the character sheet internally (ability modifier + proficiency if applicable)
- Compare total vs the DC you set in Step 1
- NEVER state whether the check succeeded or failed. Never say "that's enough", "that cuts through", "you fail", or any meta-commentary on the roll.
- Instead, show the outcome purely through the fiction: NPC reactions, what the character notices or misses, what happens next. The player should FEEL the result, not be told it.
- Include any mechanical consequences in the gamestate block, not in the narrative

# Mythic GME 2 \u2014 Oracle Integration
You have access to the Mythic GME 2 Fate Chart oracle. The player can ask the oracle directly via /oracle in chat, but YOU should also use it to drive the story:

## When to suggest a Fate roll
- When the outcome of an action is genuinely uncertain and the fiction hasn't decided it
- When an NPC's reaction could go either way
- When the player asks "would this happen?" or "is X true?"
- Frame the question clearly, state the odds you'd assign, then include the roll

## How to include oracle results in your narrative
When you consult the oracle, write it into the fiction naturally:
- State the question and odds in brackets: [Oracle: "Does the guard notice?" \u2014 Unlikely, CF 5]
- NEVER write the roll number, result text, or oracle mechanics in the visible narrative (no "Roll: 67 \u2014 Yes", no "Exceptional Yes", etc.)
- Instead, weave the oracle's answer seamlessly into the story \u2014 the player should feel the outcome through the narrative, not read a dice result
- If a Random Event triggers, incorporate it as an unexpected twist \u2014 describe what happens, not the mechanic

## Chaos Factor (1\u20139)
- Start at 5. Track it via the chaosFactor field in gamestate output.
- After each scene: if events went as expected or the player was in control, CF goes down (-1). If events spiraled or went against the player, CF goes up (+1).
- High CF (7-9): the world is volatile, surprises are frequent
- Low CF (1-3): the world is stable and predictable
- Always include chaosFactor in your gamestate when it should change

## Random Events
- Triggered on doubles rolls where the digit \u2264 CF (handled automatically by the oracle)
- When a random event occurs, interpret the Focus + Action + Subject creatively
- Weave it into the current scene as an interruption, revelation, or complication

# Combat System
When combat begins, include a combatStart block with all enemies. The app tracks initiative, HP, and turns automatically.

## Starting Combat
Include combatStart with every enemy. Roll initiative for the player too (d20 + DEX modifier).
Announce turn order in your narrative. Example gamestate:
  "combatStart": { "enemies": [{ "name": "Goblin", "initiative": 14, "hp": { "current": 7, "max": 7 }, "ac": 15 }], "playerInitiative": 12 }

## During Combat
- Use combatDamage for ALL damage: [{ "target": "player", "amount": 8 }, { "target": "enemy-Goblin-0", "amount": 12 }]
- Use combatHealing for healing: [{ "target": "player", "amount": 5 }]
- For multiple enemies of the same type, append index: "enemy-Goblin-0", "enemy-Goblin-1"
- For unique enemies: "enemy-Dragon-0"
- Track whose turn it is and announce it

## Ending Combat
When all enemies are defeated or the encounter resolves: "combatEnd": true

## Spells & Resources
When the player casts a leveled spell: "spellSlotUsed": { "level": 2 }

## Death Saving Throws (5.5e)
When the player is at 0 HP, roll death saves at the start of their turn:
- Roll d20 and report: "deathSaveResult": { "roll": 14 }
- 10+ = success, 1-9 = failure, nat 1 = 2 failures, nat 20 = regain 1 HP
- 3 successes = stabilized, 3 failures = dead
- Damage at 0 HP = automatic failure (critical = 2 failures)

## Conditions
Apply conditions: "conditionsApplied": [{ "target": "player", "condition": "poisoned" }]
Remove conditions: "conditionsLifted": [{ "target": "enemy-Goblin-0", "condition": "prone" }]
Valid conditions: blinded, charmed, deafened, exhaustion, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious, concentrating

## Resting
When the player takes a rest: "restType": "short" or "restType": "long"
For short rests, include how many hit dice to spend: "hitDiceUsed": 2

# Speech Segments (Text-to-Speech)
The app has a text-to-speech system with different voice profiles for different speakers. After your narrative, include a speech block that breaks your response into tagged segments for voice synthesis. Each segment has a speaker type and the text to read aloud.

Available speaker types:
- "narrator" \u2014 your descriptive prose, scene-setting, and narration (default)
- "villain" \u2014 antagonists, dark creatures, evil NPCs (deep, slow voice)
- "elder" \u2014 wise old characters, sages, mentors (low, deliberate voice)
- "warrior" \u2014 fighters, guards, soldiers, brave NPCs (strong, steady voice)
- "mystic" \u2014 mages, seers, mysterious entities (high, ethereal voice)
- "merchant" \u2014 shopkeepers, traders, innkeepers (bright, quick voice)

Wrap it exactly like this:

\`\`\`speech
[
  { "speaker": "narrator", "text": "Du tr\xE4der in i den m\xF6rka grottan. Vattendroppar ekar mot stenv\xE4ggarna." },
  { "speaker": "villain", "text": "Vem v\xE5gar st\xF6ra min slummer?" }
]
\`\`\`

Rules for the speech block:
- Include it in EVERY response (not just combat/mechanical ones)
- CRITICAL: The speech block must cover ALL narrative text from your response \u2014 every sentence, every paragraph, every piece of dialogue. Do not skip or omit any part of the narrative. If you wrote it above, it must appear in the speech block.
- Break the narrative into logical segments \u2014 one per speaker change or scene beat
- Strip markdown formatting from the text (no **, #, etc.)
- Keep the text natural for spoken delivery \u2014 no dice notation, no brackets
- NPC dialogue gets the speaker type matching their character
- Your narration and descriptions use "narrator"
- Omit mechanical details (dice rolls, AC, HP numbers) from speech text \u2014 those are visual-only
- The speech block is separate from and in addition to the gamestate block

# Audio Cues
The app has an ambient sound and music system. Include an "audio" object in your gamestate block to control the soundscape. Only include audio when the scene changes \u2014 not every response.

Available ambient types: "tavern", "forest", "dungeon", "city", "cave", "field", "sea"
Available music moods: "exploration", "combat", "tension", "mystery", "rest", "triumph"
Available sfx: "sword_hit", "spell_cast", "door_creak", "loot_pickup", "level_up", "footsteps_stone", "dice_roll", "death"

Example: "audio": { "ambient": "dungeon", "music": "tension", "sfx": ["door_creak", "footsteps_stone"] }

Guidelines:
- Set ambient when the location changes (entering a tavern, stepping into a forest)
- Set music when the mood shifts (combat starts, a mystery unfolds, resting at camp)
- Set sfx for punctual events (a sword strike, finding loot, opening a door)
- Combat always sets music to "combat". When combat ends, switch to "exploration" or "rest"
- You can set ambient to null or music to null to stop that layer

# World & Locations
You have a persistent world map. When the player enters a new area, include a locationUpdate in your gamestate to create or update the location. Always specify:
- name: the location name
- type: region, city, dungeon, wilderness, building, forest, ruin, sea, fort, temple, or village
- status: undiscovered (only heard of), known (seen but not explored), visited (explored), or completed (fully cleared/resolved)
- description: 1-2 vivid sentences about the place
- terrain: plains, forest, mountain, desert, swamp, coastal, underground, urban, or arctic
- parentName: the parent region/city this is inside (if applicable)
- connectedTo: array of names of other nearby locations this connects to

When the player moves to a previously visited location, still include locationUpdate to track the visit (status: "visited").
When the player hears about a place but hasn't been there, use status: "known".
When the player fully clears a dungeon or resolves all business at a location, use status: "completed".

Example: "locationUpdate": { "name": "The Rusty Tankard", "type": "building", "status": "visited", "description": "A dimly lit tavern with smoke-stained beams and the smell of cheap ale.", "terrain": "urban", "parentName": "Waterdeep", "connectedTo": ["Waterdeep Market Square"] }

# Factions & Reputation
Track factions the player encounters. When the player meets a new faction for the first time:
  "factionMet": { "name": "The Harpers", "description": "A secretive network of spies and operatives", "alignment": "Neutral Good" }

When the player's actions affect their standing with a faction:
  "reputationChange": { "factionName": "The Harpers", "change": 5, "reason": "Helped rescue a Harper agent" }

Reputation ranges from 0 (sworn enemy) to 100 (exalted). Start at 50 (neutral). Changes should be proportional:
- Minor acts (politeness, small favors): +1 to +5
- Significant deeds (completing a quest for them): +5 to +15
- Major storyline events (saving their leader): +15 to +25
- Betrayal or aggression: -5 to -25

# NPC Interactions
When the player has a meaningful interaction with an NPC, log it:
  "npcInteraction": { "npcName": "Elara", "type": "conversation", "summary": "Discussed the missing caravan and agreed to help investigate", "sentiment": "positive" }

Types: conversation, combat, trade, quest, other.
Include this for important exchanges, not every single line of dialogue.

# Travel System
When the player decides to travel between known locations, include:
  "travelStart": { "from": "Waterdeep", "to": "Neverwinter", "terrain": "forest", "dangerLevel": 3 }

The app will roll for random encounters based on terrain and danger level (1-5). If an encounter is triggered, you will be told in a follow-up message \u2014 narrate it dramatically with vivid descriptions of the journey, weather, and passing landmarks. Danger levels:
- 1: Safe roads, civilized areas
- 2: Light wilderness, patrolled territory
- 3: Moderate wilderness, sparse civilization
- 4: Deep wilderness, monster territory
- 5: Extremely dangerous, hostile lands

# Time of Day
The world has a persistent time system. Time is shown in the campaign context. Weave it naturally into your narrative:
- Dawn/morning: merchants opening shops, morning patrols, dew on grass, roosters crowing
- Midday/afternoon: busy markets, full taverns, guards at peak alertness
- Dusk/evening: shops closing, lanterns being lit, shadier characters emerging
- Night/midnight: guards on patrol, thieves active, most shops closed, darkness and danger

When significant time passes (travel, long rest, waiting), include "timeAdvance" in your gamestate with the number of hours. Examples:
- Short rest: "timeAdvance": 1
- Long rest: "timeAdvance": 8
- Travel between nearby locations: "timeAdvance": 2-4
- A full day's journey: "timeAdvance": 10

Time affects the world: NPCs have schedules, shops have hours, encounters vary by time. A tavern at midnight feels different from one at noon. Use time to create atmosphere and drive gameplay decisions.

# Loot & Items
When the player defeats monsters or finds treasure, include detailed loot in your gamestate using the enhanced lootFound format:
  "lootFound": [{ "name": "Steel Longsword", "category": "weapon", "rarity": "common", "description": "A well-forged blade with a leather-wrapped hilt.", "weight": 3, "value_gp": 15, "value_sp": 0, "value_cp": 0, "properties": { "damage": "1d8", "damageType": "slashing" } }]

Currency found separately: "currencyFound": { "gp": 25, "sp": 10, "cp": 50 }

Item categories: weapon, armor, potion, scroll, gear, treasure, tool, other
Rarities: common, uncommon, rare, very_rare, legendary

For weapons, always include damage/damageType in properties. For armor, include ac and type. For potions/scrolls, include effect.

# Structured Output
After your narrative, you MUST include a JSON block to update game state whenever something mechanically relevant happens (combat, damage, healing, loot, conditions, location changes, etc.). Wrap it exactly like this:

\`\`\`gamestate
{
  "hpChange": 0,
  "lootFound": [{ "name": "...", "category": "weapon", "rarity": "common", "description": "...", "weight": 3, "value_gp": 15, "value_sp": 0, "value_cp": 0, "properties": {} }],
  "currencyFound": { "gp": 0, "sp": 0, "cp": 0 },
  "timeAdvance": 0,
  "xpGained": 0,
  "memoryUpdate": "",
  "locationChange": "",
  "chaosFactor": 0,
  "npcMet": null,
  "questUpdate": null,
  "combatStart": { "enemies": [...], "playerInitiative": 12 },
  "combatDamage": [{ "target": "enemy-Goblin-0", "amount": 7 }],
  "combatHealing": [{ "target": "player", "amount": 5 }],
  "combatEnd": true,
  "conditionsApplied": [{ "target": "player", "condition": "poisoned" }],
  "conditionsLifted": [{ "target": "player", "condition": "poisoned" }],
  "spellSlotUsed": { "level": 1 },
  "deathSaveResult": { "roll": 14 },
  "restType": "short",
  "hitDiceUsed": 2,
  "audio": { "ambient": "dungeon", "music": "tension", "sfx": ["door_creak"] },
  "locationUpdate": { "name": "Dark Cavern", "type": "dungeon", "status": "visited", "description": "A dripping cave entrance.", "terrain": "underground" },
  "factionMet": { "name": "The Zhentarim", "description": "A shadowy mercantile network", "alignment": "Lawful Evil" },
  "reputationChange": { "factionName": "The Zhentarim", "change": -5, "reason": "Refused their contract" },
  "npcInteraction": { "npcName": "Elara", "type": "conversation", "summary": "Discussed the quest", "sentiment": "positive" },
  "travelStart": { "from": "Waterdeep", "to": "Neverwinter", "terrain": "forest", "dangerLevel": 3 }
}
\`\`\`

Rules for the gamestate block:
- Only include fields that changed. Omit unchanged fields.
- hpChange: negative for damage, positive for healing (use for out-of-combat HP changes; in combat use combatDamage/combatHealing instead)
- memoryUpdate: one sentence summarising the most important thing that happened (for long-term campaign memory)
- chaosFactor: the CHANGE (+1, -1, or 0), not the absolute value
- npcMet: { "name": "...", "race": "...", "disposition": "friendly|neutral|hostile", "description": "..." } or null
- questUpdate: { "title": "...", "status": "rumor|active|completed|failed", "description": "...", "sourceNpcName": "...", "targetLocationName": "...", "reward": { "gp": 100, "items": ["Enchanted Ring"], "reputation": { "factionName": "The Harpers", "change": 10 }, "narrative": "..." }, "update": "One sentence describing what changed" } or null

# Quest & Rumor System
Quests follow a natural lifecycle: rumor \u2192 active \u2192 completed/failed.
- When an NPC mentions something intriguing, a missing person, strange happenings, or an opportunity, create a RUMOR: questUpdate with status "rumor". Rumors are whispers and hints, not formal quests yet.
- When the player investigates or accepts a rumor, upgrade it to ACTIVE: questUpdate with the same title and status "active".
- Include "sourceNpcName" to link which NPC gave the quest, and "targetLocationName" if there's a destination.
- Include "update" with a brief one-sentence log entry each time something changes about the quest.
- When complete, include "reward" with appropriate gold, items, reputation changes, and/or a narrative reward description.
- Make rumors feel organic \u2014 NPCs drop hints in conversation, tavern patrons whisper about dangers, notice boards have postings.
- lootFound: array of items with name, category, rarity, description, weight, value_gp/sp/cp, properties (see Loot section above)
- currencyFound: { gp, sp, cp } \u2014 coins found separate from items
- timeAdvance: number of hours that passed (travel, rest, waiting)
- CRITICAL: When combat begins, you MUST include combatStart with enemies array and playerInitiative. The app's combat tracker depends on this \u2014 without it, combat UI won't activate.
- Do NOT include the gamestate block for purely conversational responses
- The narrative MUST be complete on its own \u2014 never put story content inside the JSON

# Player Character
You will receive the character's details in the CAMPAIGN CONTEXT block. Track their HP, spell slots, conditions, and abilities across the session. When they level up, guide them through the process.

# Language
Always respond in English, regardless of what language the player writes or speaks in. The player may use voice input in Swedish or other languages \u2014 understand their intent but always write your narrative, dialogue, and all text in English.`;
var LANGUAGE_SECTIONS = {
  sv: `# Language
Always write ALL narrative text, NPC dialogue, and speech block text in English. The player may write or speak in Swedish \u2014 understand their intent fully but ALWAYS respond in English. Game mechanics (dice rolls, stats) use English notation.`,
  en: `# Language
Always write ALL narrative text, NPC dialogue, and speech block text in English. The player may write or speak in other languages \u2014 understand their intent fully but ALWAYS respond in English.`
};
function buildSystemPrompt(campaign, ragContext, memories, activeConditions, ttsLanguage, worldContext) {
  let base = BASE_PROMPT;
  if (ttsLanguage && LANGUAGE_SECTIONS[ttsLanguage]) {
    base = base.replace(/# Language\n.*$/, LANGUAGE_SECTIONS[ttsLanguage]);
  }
  const parts = [base];
  if (campaign) {
    const timeLine = worldContext?.worldTime ? `
Time: Day ${worldContext.worldTime.day}, ${worldContext.worldTime.timeOfDay} (hour ${worldContext.worldTime.hour})` : "";
    const locationLine = worldContext?.currentLocation ? `
Current Location: ${worldContext.currentLocation.name} (${worldContext.currentLocation.type})${worldContext.currentLocation.description ? " \u2014 " + worldContext.currentLocation.description : ""}` : "";
    const factionLines = worldContext?.factionReputations?.length ? `
Faction Standings: ${worldContext.factionReputations.map((f) => `${f.name}: ${f.tier} (${f.score}/100)`).join(", ")}` : "";
    const locationsList = worldContext?.discoveredLocations?.length ? `
Known Locations: ${worldContext.discoveredLocations.join(", ")}` : "";
    const questLines = worldContext?.activeQuests?.length ? `
Active Quests & Rumors:
${worldContext.activeQuests.map((q) => `  - [${q.status}] ${q.title}${q.description ? ": " + q.description : ""}`).join("\n")}` : "";
    const dmNotesBlock = campaign.dm_notes ? `

[DM NOTES \u2014 follow these instructions for this campaign]
${campaign.dm_notes}
[END DM NOTES]` : "";
    parts.push(`
[CAMPAIGN CONTEXT]
Campaign: ${campaign.name}
Setting: ${campaign.setting || "Standard fantasy"}
Character: ${campaign.character_name || "Unknown"}, Level ${campaign.character_level} ${campaign.character_class || "Adventurer"}
Description: ${campaign.description || "A new adventure begins."}
Chaos Factor: ${campaign.chaos_factor ?? 5}/9${activeConditions && activeConditions.length > 0 ? `
Active Conditions: ${activeConditions.join(", ")}` : ""}${timeLine}${locationLine}${factionLines}${locationsList}${questLines}
[END CAMPAIGN CONTEXT]${dmNotesBlock}`);
  }
  if (memories.length > 0) {
    parts.push(`
[CAMPAIGN MEMORY \u2014 key events from previous sessions]
${memories.map((m, i) => `${i + 1}. ${m}`).join("\n")}
[END CAMPAIGN MEMORY]`);
  }
  if (ragContext) {
    parts.push(`
[SOURCE MATERIAL \u2014 use to inform your descriptions, NPCs, locations, rules, and plot. Weave naturally into the narrative. Never quote directly or break immersion.]
${ragContext}
[END SOURCE MATERIAL]`);
  }
  return parts.join("\n\n");
}
var MAX_HISTORY_MESSAGES = 20;
var MAX_RESPONSE_TOKENS = 2048;

// server/routes/chat.ts
var chatRoutes = (0, import_express3.Router)();
function streamClaude({ systemPrompt, messages, onText, onEnd, onError }) {
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: MAX_RESPONSE_TOKENS,
    temperature: 1,
    system: systemPrompt,
    messages
  });
  stream.on("text", onText);
  stream.on("end", onEnd);
  stream.on("error", onError);
}
function streamOpenAI({ systemPrompt, messages, onText, onEnd, onError }) {
  const openaiMessages = [
    { role: "system", content: systemPrompt },
    ...messages
  ];
  (async () => {
    try {
      const stream = await openai3.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        stream: true,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.9
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) onText(content);
      }
      onEnd();
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();
}
chatRoutes.post("/", async (req, res) => {
  try {
    const { message, campaign_id, session_id, history = [], provider: overrideProvider, ttsLanguage } = req.body;
    if (!message || !campaign_id) {
      res.status(400).json({ error: "Missing message or campaign_id" });
      return;
    }
    const [campaignResult, ragResults, memoriesResult, locationsResult, factionsResult, reputationsResult, questsResult] = await Promise.all([
      supabaseAdmin.from("campaigns").select("*").eq("id", campaign_id).single(),
      getRAGContext(message, campaign_id, req.body.user_id),
      supabaseAdmin.from("campaign_memories").select("content, category, importance").eq("campaign_id", campaign_id).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("world_locations").select("id, name, type, description, discovered").eq("campaign_id", campaign_id).eq("discovered", true),
      supabaseAdmin.from("factions").select("id, name").eq("campaign_id", campaign_id),
      supabaseAdmin.from("faction_reputation").select("faction_id, score").eq("campaign_id", campaign_id),
      supabaseAdmin.from("quests").select("title, status, description").eq("campaign_id", campaign_id).in("status", ["rumor", "active"])
    ]);
    const campaign = campaignResult.data;
    const memories = (memoriesResult.data || []).map(
      (m) => {
        const prefix = m.category ? `[${m.category}${m.importance === "high" ? " \u2605" : ""}] ` : "";
        return prefix + m.content;
      }
    );
    const locations = locationsResult.data || [];
    const factions = factionsResult.data || [];
    const reputations = reputationsResult.data || [];
    const tierFromScore = (score) => {
      if (score <= 10) return "enemy";
      if (score <= 25) return "unfriendly";
      if (score <= 50) return "neutral";
      if (score <= 70) return "friendly";
      if (score <= 90) return "honored";
      return "exalted";
    };
    const currentLoc = campaign?.current_location_id ? locations.find((l) => l.id === campaign.current_location_id) || null : null;
    const activeQuests = questsResult.data || [];
    const resolveTimeOfDay = (h) => h >= 5 && h < 7 ? "dawn" : h >= 7 && h < 10 ? "morning" : h >= 10 && h < 14 ? "midday" : h >= 14 && h < 17 ? "afternoon" : h >= 17 && h < 19 ? "dusk" : h >= 19 && h < 21 ? "evening" : h >= 21 || h < 1 ? "night" : "midnight";
    const worldContext = {
      worldTime: campaign ? { day: campaign.world_day ?? 1, hour: campaign.world_hour ?? 8, timeOfDay: resolveTimeOfDay(campaign.world_hour ?? 8) } : void 0,
      currentLocation: currentLoc ? { name: currentLoc.name, type: currentLoc.type, description: currentLoc.description } : null,
      factionReputations: factions.map((f) => {
        const rep = reputations.find((r) => r.faction_id === f.id);
        const score = rep?.score ?? 50;
        return { name: f.name, score, tier: tierFromScore(score) };
      }),
      discoveredLocations: locations.map((l) => l.name),
      activeQuests: activeQuests.map((q) => ({ title: q.title, status: q.status, description: q.description }))
    };
    const campaignProvider = overrideProvider === "openai" || overrideProvider === "claude" ? overrideProvider : campaign?.ai_provider ?? "claude";
    const provider = resolveProvider(req.body.user_id, campaignProvider);
    let activeConditions = [];
    if (campaign) {
      const { data: sheet } = await supabaseAdmin.from("character_sheets").select("data").eq("campaign_id", campaign_id).single();
      if (sheet?.data) {
        activeConditions = sheet.data.activeConditions ?? [];
      }
    }
    const systemPrompt = buildSystemPrompt(campaign, ragResults, memories, activeConditions, ttsLanguage, worldContext);
    const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    const chatMessages = [
      ...trimmedHistory.map((h) => ({
        role: h.role,
        content: h.content
      })),
      { role: "user", content: message }
    ];
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    let fullResponse = "";
    const streamFn = provider === "openai" ? streamOpenAI : streamClaude;
    streamFn({
      systemPrompt,
      messages: chatMessages,
      onText(text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}

`);
      },
      async onEnd() {
        const speechSegments = parseSpeechSegments(fullResponse);
        if (speechSegments) {
          res.write(`data: ${JSON.stringify({ speechSegments })}

`);
        }
        const gameState = parseGameState(fullResponse);
        if (gameState) {
          res.write(`data: ${JSON.stringify({ gameState })}

`);
          await processGameState(gameState, campaign_id, session_id);
        }
        res.write("data: [DONE]\n\n");
        res.end();
      },
      onError(error) {
        const msg = error.message || "Stream error";
        console.error(`${provider} stream error:`, msg);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: msg })}

`);
          res.end();
        }
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat error:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}

`);
      res.end();
    }
  }
});
async function getRAGContext(query, campaignId, userId) {
  try {
    const embeddingResponse = await withRetry(
      () => openai3.embeddings.create({
        model: "text-embedding-3-small",
        input: query
      }),
      { maxRetries: 2, timeoutMs: 15e3 }
    );
    const queryEmbedding = embeddingResponse.data[0].embedding;
    const rpcName = userId ? "match_documents_with_rulebooks" : "match_documents";
    const rpcParams = userId ? {
      query_embedding: JSON.stringify(queryEmbedding),
      match_campaign_id: campaignId,
      match_user_id: userId,
      match_count: 8
    } : {
      query_embedding: JSON.stringify(queryEmbedding),
      match_campaign_id: campaignId,
      match_count: 5
    };
    const { data: ragResults } = await supabaseAdmin.rpc(rpcName, rpcParams);
    if (!ragResults || ragResults.length === 0) return "";
    return ragResults.filter((r) => r.similarity > 0.3).map((r) => r.content).join("\n\n---\n\n");
  } catch {
    return "";
  }
}
function parseSpeechSegments(text) {
  const match = text.match(/```speech\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return null;
  } catch {
    return null;
  }
}
function parseGameState(text) {
  const match = text.match(/```gamestate\s*\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
async function processGameState(gs, campaignId, sessionId) {
  const updates = {};
  if (gs.chaosFactor) {
    const { data: campaign } = await supabaseAdmin.from("campaigns").select("chaos_factor").eq("id", campaignId).single();
    if (campaign) {
      const newChaos = Math.max(1, Math.min(9, campaign.chaos_factor + gs.chaosFactor));
      updates.chaos_factor = newChaos;
    }
  }
  if (gs.hpChange && gs.hpChange !== 0) {
    const { data: campaign } = await supabaseAdmin.from("campaigns").select("current_hp").eq("id", campaignId).single();
    if (campaign?.current_hp != null) {
      updates.current_hp = campaign.current_hp + gs.hpChange;
    }
  }
  if (Object.keys(updates).length > 0) {
    await supabaseAdmin.from("campaigns").update(updates).eq("id", campaignId);
  }
  if (gs.memoryUpdate) {
    const memoryCategory = gs.memoryUpdate.startsWith("[") ? gs.memoryUpdate.match(/^\[(plot|npc|world|character|item)\]/i)?.[1]?.toLowerCase() || "plot" : "plot";
    const memoryContent = gs.memoryUpdate.replace(/^\[(plot|npc|world|character|item)\]\s*/i, "");
    await supabaseAdmin.from("campaign_memories").insert({
      campaign_id: campaignId,
      session_id: sessionId || null,
      content: memoryContent,
      category: memoryCategory,
      importance: "medium",
      source: "ai"
    });
  }
  if (gs.npcMet) {
    const { data: newNpc } = await supabaseAdmin.from("npcs").insert({
      campaign_id: campaignId,
      name: gs.npcMet.name,
      race: gs.npcMet.race || null,
      description: gs.npcMet.description || null,
      disposition: gs.npcMet.disposition || "neutral"
    }).select("id, campaign_id, name, race, occupation, description").single();
    if (newNpc) {
      generateNpcPortraitAsync(newNpc);
    }
  }
  if (gs.questUpdate) {
    const { data: existing } = await supabaseAdmin.from("quests").select("id, updates, status").eq("campaign_id", campaignId).eq("title", gs.questUpdate.title).single();
    let sourceNpcId = null;
    if (gs.questUpdate.sourceNpcName) {
      const { data: npc } = await supabaseAdmin.from("npcs").select("id").eq("campaign_id", campaignId).eq("name", gs.questUpdate.sourceNpcName).single();
      sourceNpcId = npc?.id ?? null;
    }
    let targetLocationId = null;
    if (gs.questUpdate.targetLocationName) {
      const { data: loc } = await supabaseAdmin.from("world_locations").select("id").eq("campaign_id", campaignId).eq("name", gs.questUpdate.targetLocationName).single();
      targetLocationId = loc?.id ?? null;
    }
    let reward = null;
    if (gs.questUpdate.reward) {
      const r = gs.questUpdate.reward;
      let repData = null;
      if (r.reputation) {
        const { data: faction } = await supabaseAdmin.from("factions").select("id").eq("campaign_id", campaignId).eq("name", r.reputation.factionName).single();
        if (faction) repData = { factionId: faction.id, change: r.reputation.change };
      }
      reward = {
        ...r.gp != null && { gp: r.gp },
        ...r.items && { items: r.items },
        ...repData && { reputation: repData },
        ...r.narrative && { narrative: r.narrative }
      };
    }
    if (existing) {
      const prevUpdates = existing.updates || [];
      const newUpdate = gs.questUpdate.update ? [...prevUpdates, { timestamp: (/* @__PURE__ */ new Date()).toISOString(), text: gs.questUpdate.update }] : prevUpdates;
      const questPatch = {
        status: gs.questUpdate.status,
        updates: newUpdate
      };
      if (gs.questUpdate.description) questPatch.description = gs.questUpdate.description;
      if (sourceNpcId) questPatch.source_npc_id = sourceNpcId;
      if (targetLocationId) questPatch.target_location_id = targetLocationId;
      if (reward && Object.keys(reward).length > 0) questPatch.reward = reward;
      if (gs.questUpdate.status === "completed" || gs.questUpdate.status === "failed") {
        questPatch.completed_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      await supabaseAdmin.from("quests").update(questPatch).eq("id", existing.id);
    } else {
      const initialUpdates = gs.questUpdate.update ? [{ timestamp: (/* @__PURE__ */ new Date()).toISOString(), text: gs.questUpdate.update }] : [];
      await supabaseAdmin.from("quests").insert({
        campaign_id: campaignId,
        title: gs.questUpdate.title,
        description: gs.questUpdate.description || null,
        status: gs.questUpdate.status || "rumor",
        source_npc_id: sourceNpcId,
        target_location_id: targetLocationId,
        reward: reward && Object.keys(reward).length > 0 ? reward : null,
        updates: initialUpdates
      });
    }
  }
  if (gs.lootFound && gs.lootFound.length > 0) {
    const items = gs.lootFound.map((item) => ({
      campaign_id: campaignId,
      name: item.name,
      description: item.description || null,
      category: item.category || "other",
      quantity: 1
    }));
    await supabaseAdmin.from("inventory_items").insert(items);
  }
  if (gs.spellSlotUsed) {
    const { data: sheet } = await supabaseAdmin.from("character_sheets").select("data").eq("campaign_id", campaignId).single();
    if (sheet?.data) {
      const charData = sheet.data;
      const slots = charData.spellSlots;
      const level = String(gs.spellSlotUsed.level);
      if (slots?.[level] && slots[level].used < slots[level].max) {
        slots[level].used += 1;
        await supabaseAdmin.from("character_sheets").update({ data: charData, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("campaign_id", campaignId);
      }
    }
  }
  if (gs.hpChange && gs.hpChange !== 0) {
    const { data: sheet } = await supabaseAdmin.from("character_sheets").select("data").eq("campaign_id", campaignId).single();
    if (sheet?.data) {
      const charData = sheet.data;
      const hp = charData.hp;
      if (hp) {
        hp.current = Math.max(0, Math.min(hp.max, hp.current + gs.hpChange));
        await supabaseAdmin.from("character_sheets").update({ data: charData, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("campaign_id", campaignId);
      }
    }
  }
  if (gs.conditionsApplied || gs.conditionsLifted) {
    const { data: sheet } = await supabaseAdmin.from("character_sheets").select("data").eq("campaign_id", campaignId).single();
    if (sheet?.data) {
      const charData = sheet.data;
      let conditions = charData.activeConditions ?? [];
      for (const c of gs.conditionsApplied ?? []) {
        if (c.target === "player" && !conditions.includes(c.condition)) {
          conditions.push(c.condition);
        }
      }
      for (const c of gs.conditionsLifted ?? []) {
        if (c.target === "player") {
          conditions = conditions.filter((cond) => cond !== c.condition);
        }
      }
      charData.activeConditions = conditions;
      await supabaseAdmin.from("character_sheets").update({ data: charData, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("campaign_id", campaignId);
    }
  }
  let resolvedLocationId = null;
  if (gs.locationUpdate) {
    const loc = gs.locationUpdate;
    const { data: existing } = await supabaseAdmin.from("world_locations").select("id, visit_count").eq("campaign_id", campaignId).eq("name", loc.name).single();
    if (existing) {
      resolvedLocationId = existing.id;
      const resolvedStatus = loc.status || "visited";
      const locUpdates = {
        discovered: resolvedStatus !== "undiscovered",
        visit_count: resolvedStatus === "visited" ? existing.visit_count + 1 : existing.visit_count,
        status: resolvedStatus
      };
      if (loc.description) locUpdates.description = loc.description;
      if (loc.terrain) locUpdates.terrain = loc.terrain;
      if (loc.type) locUpdates.type = loc.type;
      await supabaseAdmin.from("world_locations").update(locUpdates).eq("id", existing.id);
    } else {
      let parentId = null;
      if (loc.parentName) {
        const { data: parent } = await supabaseAdmin.from("world_locations").select("id").eq("campaign_id", campaignId).eq("name", loc.parentName).single();
        parentId = parent?.id ?? null;
      }
      const coords = loc.coordinates ?? {
        x: Math.random() * 800 + 100,
        y: Math.random() * 600 + 100
      };
      const resolvedStatus = loc.status || "visited";
      const { data: newLoc } = await supabaseAdmin.from("world_locations").insert({
        campaign_id: campaignId,
        name: loc.name,
        type: loc.type || "building",
        status: resolvedStatus,
        parent_id: parentId,
        description: loc.description || null,
        discovered: resolvedStatus !== "undiscovered",
        visit_count: resolvedStatus === "visited" ? 1 : 0,
        coordinates_x: coords.x,
        coordinates_y: coords.y,
        terrain: loc.terrain || null
      }).select("id, campaign_id, name, type, description").single();
      if (newLoc) {
        resolvedLocationId = newLoc.id;
        generateLocationImageAsync(newLoc);
      }
    }
    if (loc.connectedTo && resolvedLocationId) {
      for (const connName of loc.connectedTo) {
        const { data: connLoc } = await supabaseAdmin.from("world_locations").select("id, connected_locations").eq("campaign_id", campaignId).eq("name", connName).single();
        if (connLoc) {
          const connIds = connLoc.connected_locations || [];
          if (!connIds.includes(resolvedLocationId)) {
            await supabaseAdmin.from("world_locations").update({ connected_locations: [...connIds, resolvedLocationId] }).eq("id", connLoc.id);
          }
          const { data: thisLoc } = await supabaseAdmin.from("world_locations").select("connected_locations").eq("id", resolvedLocationId).single();
          const thisConnIds = thisLoc?.connected_locations || [];
          if (!thisConnIds.includes(connLoc.id)) {
            await supabaseAdmin.from("world_locations").update({ connected_locations: [...thisConnIds, connLoc.id] }).eq("id", resolvedLocationId);
          }
        }
      }
    }
    if (resolvedLocationId) {
      await supabaseAdmin.from("campaigns").update({ current_location_id: resolvedLocationId }).eq("id", campaignId);
    }
  }
  if (gs.factionMet) {
    const { data: existing } = await supabaseAdmin.from("factions").select("id").eq("campaign_id", campaignId).eq("name", gs.factionMet.name).single();
    if (!existing) {
      const { data: newFaction } = await supabaseAdmin.from("factions").insert({
        campaign_id: campaignId,
        name: gs.factionMet.name,
        description: gs.factionMet.description || null,
        alignment: gs.factionMet.alignment || null
      }).select("id").single();
      if (newFaction) {
        await supabaseAdmin.from("faction_reputation").insert({
          campaign_id: campaignId,
          faction_id: newFaction.id,
          score: 50
        });
      }
    }
  }
  if (gs.reputationChange) {
    const { data: faction } = await supabaseAdmin.from("factions").select("id").eq("campaign_id", campaignId).eq("name", gs.reputationChange.factionName).single();
    if (faction) {
      const { data: rep } = await supabaseAdmin.from("faction_reputation").select("score").eq("campaign_id", campaignId).eq("faction_id", faction.id).single();
      if (rep) {
        const newScore = Math.max(0, Math.min(100, rep.score + gs.reputationChange.change));
        await supabaseAdmin.from("faction_reputation").update({ score: newScore }).eq("campaign_id", campaignId).eq("faction_id", faction.id);
      }
    }
  }
  if (gs.npcInteraction) {
    const { data: npc } = await supabaseAdmin.from("npcs").select("id, disposition").eq("campaign_id", campaignId).eq("name", gs.npcInteraction.npcName).single();
    if (npc) {
      const { data: campaign } = await supabaseAdmin.from("campaigns").select("current_location_id").eq("id", campaignId).single();
      await supabaseAdmin.from("npc_interaction_logs").insert({
        campaign_id: campaignId,
        npc_id: npc.id,
        session_id: sessionId || null,
        location_id: campaign?.current_location_id || null,
        interaction_type: gs.npcInteraction.type || "conversation",
        summary: gs.npcInteraction.summary,
        sentiment: gs.npcInteraction.sentiment || null,
        disposition_before: npc.disposition,
        disposition_after: npc.disposition
      });
    }
  }
  if (gs.travelStart) {
    const [fromResult, toResult] = await Promise.all([
      supabaseAdmin.from("world_locations").select("id").eq("campaign_id", campaignId).eq("name", gs.travelStart.from).single(),
      supabaseAdmin.from("world_locations").select("id").eq("campaign_id", campaignId).eq("name", gs.travelStart.to).single()
    ]);
    await supabaseAdmin.from("travel_events").insert({
      campaign_id: campaignId,
      session_id: sessionId || null,
      from_location_id: fromResult.data?.id || null,
      to_location_id: toResult.data?.id || null
    });
  }
  if (gs.npcMet && resolvedLocationId) {
    const { data: npcRecord } = await supabaseAdmin.from("npcs").select("id").eq("campaign_id", campaignId).eq("name", gs.npcMet.name).single();
    if (npcRecord) {
      await supabaseAdmin.from("npcs").update({ location_id: resolvedLocationId }).eq("id", npcRecord.id);
    }
  }
}
function generateNpcPortraitAsync(npc) {
  supabaseAdmin.from("campaigns").select("image_generation_enabled").eq("id", npc.campaign_id).single().then(async ({ data: camp }) => {
    if (!camp?.image_generation_enabled) return;
    const parts = [`Fantasy character portrait of ${npc.name}`];
    if (npc.race || npc.occupation) {
      parts[0] += `, a ${[npc.race, npc.occupation].filter(Boolean).join(" ")}`;
    }
    if (npc.description) parts.push(npc.description);
    parts.push("Style: detailed fantasy oil painting, dramatic lighting, dark background.");
    parts.push("Do not include any text, labels, or watermarks. Square format, bust portrait.");
    const prompt = parts.join(". ");
    const promptHash = import_crypto.default.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
    try {
      const response = await withRetry(
        () => openai3.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json"
        }),
        { maxRetries: 2, timeoutMs: 6e4 }
      );
      const b64 = response.data[0].b64_json;
      if (!b64) return;
      const buffer = Buffer.from(b64, "base64");
      const storagePath = `${npc.campaign_id}/npc_portrait/${promptHash}.png`;
      await supabaseAdmin.storage.from("generated-images").upload(storagePath, buffer, { contentType: "image/png", upsert: true });
      const { data: urlData } = supabaseAdmin.storage.from("generated-images").getPublicUrl(storagePath);
      await supabaseAdmin.from("generated_images").upsert({
        campaign_id: npc.campaign_id,
        prompt_hash: promptHash,
        image_type: "npc_portrait",
        storage_path: storagePath,
        public_url: urlData.publicUrl
      }, { onConflict: "campaign_id,prompt_hash" });
      await supabaseAdmin.from("npcs").update({ portrait_url: urlData.publicUrl }).eq("id", npc.id);
    } catch (err) {
      console.error("Auto portrait generation failed:", err instanceof Error ? err.message : err);
    }
  });
}
function generateLocationImageAsync(location) {
  const run = supabaseAdmin.from("campaigns").select("image_generation_enabled").eq("id", location.campaign_id).single().then(async ({ data: camp }) => {
    if (!camp?.image_generation_enabled) return;
    const parts = [`Fantasy environment: ${location.name}`];
    if (location.description) parts.push(location.description);
    parts.push("Style: detailed fantasy concept art, atmospheric, cinematic lighting.");
    parts.push("Do not include any text, labels, or watermarks. Wide format landscape.");
    const prompt = parts.join(". ");
    const promptHash = import_crypto.default.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
    try {
      const response = await withRetry(
        () => openai3.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: "1792x1024",
          quality: "standard",
          response_format: "b64_json"
        }),
        { maxRetries: 2, timeoutMs: 6e4 }
      );
      const b64 = response.data[0].b64_json;
      if (!b64) return;
      const buffer = Buffer.from(b64, "base64");
      const storagePath = `${location.campaign_id}/location/${promptHash}.png`;
      await supabaseAdmin.storage.from("generated-images").upload(storagePath, buffer, { contentType: "image/png", upsert: true });
      const { data: urlData } = supabaseAdmin.storage.from("generated-images").getPublicUrl(storagePath);
      await supabaseAdmin.from("generated_images").upsert({
        campaign_id: location.campaign_id,
        prompt_hash: promptHash,
        image_type: "location",
        storage_path: storagePath,
        public_url: urlData.publicUrl
      }, { onConflict: "campaign_id,prompt_hash" });
      await supabaseAdmin.from("world_locations").update({ image_url: urlData.publicUrl }).eq("id", location.id);
    } catch (err) {
      console.error("Auto location image generation failed:", err instanceof Error ? err.message : err);
    }
  });
  void run;
}

// server/routes/session.ts
var import_express4 = require("express");
var sessionRoutes = (0, import_express4.Router)();
sessionRoutes.post("/", async (req, res) => {
  const { campaign_id } = req.body;
  if (!campaign_id) {
    res.status(400).json({ error: "Missing campaign_id" });
    return;
  }
  const { data, error } = await supabaseAdmin.from("sessions").insert({ campaign_id }).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ session: data });
});
sessionRoutes.get("/list/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const { data, error } = await supabaseAdmin.from("sessions").select("*").eq("campaign_id", campaignId).order("started_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ sessions: data });
});
sessionRoutes.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabaseAdmin.from("sessions").update(updates).eq("id", id).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ session: data });
});
sessionRoutes.post("/:id/message", async (req, res) => {
  const { id } = req.params;
  const { campaign_id, role, content } = req.body;
  if (!campaign_id || !role || !content) {
    res.status(400).json({ error: "Missing campaign_id, role, or content" });
    return;
  }
  const { data, error } = await supabaseAdmin.from("messages").insert({ session_id: id, campaign_id, role, content }).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ message: data });
});
sessionRoutes.get("/:id/messages", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from("messages").select("*").eq("session_id", id).order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ messages: data });
});
sessionRoutes.post("/:id/summarize", async (req, res) => {
  const { id } = req.params;
  const { campaign_id, character_name, user_id } = req.body;
  const provider = resolveProvider(user_id);
  const { data: msgs } = await supabaseAdmin.from("messages").select("role, content").eq("session_id", id).order("created_at", { ascending: true });
  if (!msgs || msgs.length === 0) {
    res.json({ summary: null });
    return;
  }
  const transcript = msgs.map((m) => `${m.role === "user" ? "PLAYER" : "DM"}: ${m.content}`).join("\n\n");
  const raw = await createCompletion({
    provider,
    maxTokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a chronicler writing a journal entry for a D&D adventurer${character_name ? ` named ${character_name}` : ""}. Based on the session transcript below:

1. Write a short, evocative title (3-7 words) that captures the essence of this session \u2014 like a chapter name in a novel. Examples: "The Goblin's Bargain", "Shadows Over Cragmaw", "A Deal in Firelight". Output this on the FIRST line prefixed with "TITLE: ".

2. Then write a first-person diary entry (2-4 paragraphs) that captures the key events, encounters, discoveries, and emotional moments. Write in an evocative, atmospheric style \u2014 as if the character is reflecting on the day's events by candlelight. Include specific details from the session. Do not include a date header or "Dear Diary" \u2014 start directly with the narrative.

SESSION TRANSCRIPT:
${transcript}`
      }
    ]
  });
  const titleMatch = raw.match(/^TITLE:\s*(.+)/m);
  const title = titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : "Untitled Session";
  const summary = raw.replace(/^TITLE:\s*.+\n+/m, "").trim();
  await supabaseAdmin.from("sessions").update({ summary, title, ended_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
  if (campaign_id) {
    await supabaseAdmin.from("campaign_memories").insert({ campaign_id, session_id: id, content: `Session summary: ${summary.slice(0, 500)}` });
  }
  res.json({ summary, title });
});

// server/routes/character.ts
var import_express5 = require("express");

// server/services/dndbeyond-sync.ts
var DNDB_CHARACTER_API = "https://character-service.dndbeyond.com/character/v5/character";
function extractCharacterId(input) {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/dndbeyond\.com\/characters\/(\d+)/);
  return match ? match[1] : null;
}
var ABILITY_IDS = {
  1: "STR",
  2: "DEX",
  3: "CON",
  4: "INT",
  5: "WIS",
  6: "CHA"
};
var ABILITY_FULL_NAMES = {
  "strength": "STR",
  "dexterity": "DEX",
  "constitution": "CON",
  "intelligence": "INT",
  "wisdom": "WIS",
  "charisma": "CHA"
};
var SKILL_ABILITY = {
  "Acrobatics": 2,
  "Animal Handling": 5,
  "Arcana": 4,
  "Athletics": 1,
  "Deception": 6,
  "History": 4,
  "Insight": 5,
  "Intimidation": 6,
  "Investigation": 4,
  "Medicine": 5,
  "Nature": 4,
  "Perception": 5,
  "Performance": 6,
  "Persuasion": 6,
  "Religion": 4,
  "Sleight of Hand": 2,
  "Stealth": 2,
  "Survival": 5
};
var CLASS_HIT_DICE = {
  barbarian: 12,
  fighter: 10,
  paladin: 10,
  ranger: 10,
  bard: 8,
  cleric: 8,
  druid: 8,
  monk: 8,
  rogue: 8,
  warlock: 8,
  sorcerer: 6,
  wizard: 6,
  artificer: 8,
  "blood hunter": 10
};
var LIGHT_ARMOR = 1;
var MEDIUM_ARMOR = 2;
var HEAVY_ARMOR = 3;
var SHIELD_ARMOR = 4;
async function fetchDndbCharacter(characterId) {
  const res = await fetch(`${DNDB_CHARACTER_API}/${characterId}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Grimoire-AI/1.0"
    }
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Character not found. Check the URL and make sure the character is set to public.");
    if (res.status === 403) throw new Error('Character is not public. Set sharing to "Public" in D&D Beyond character settings.');
    throw new Error(`D&D Beyond returned status ${res.status}`);
  }
  const json = await res.json();
  const data = json.data ?? json;
  return mapToCharacterSheet(data);
}
function getAbilityScore(data, abilityId) {
  const override = data.overrideStats?.find((s) => s.id === abilityId);
  if (override?.value) return override.value;
  const base = data.stats?.find((s) => s.id === abilityId)?.value ?? 10;
  const bonus = data.bonusStats?.find((s) => s.id === abilityId)?.value ?? 0;
  let modBonus = 0;
  const allMods = [
    ...data.modifiers?.race ?? [],
    ...data.modifiers?.feat ?? [],
    ...data.modifiers?.item ?? [],
    ...data.modifiers?.background ?? []
  ];
  const abilityName = ABILITY_IDS[abilityId]?.toLowerCase();
  for (const mod of allMods) {
    if (mod.type === "bonus" && mod.subType === `${abilityName}-score` && mod.value) {
      modBonus += mod.value;
    }
  }
  return base + bonus + modBonus;
}
function abilityMod(score) {
  return Math.floor((score - 10) / 2);
}
function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1;
}
function computeAC(data, stats, allModifiers) {
  const dexMod = abilityMod(stats.DEX);
  let equippedArmor = null;
  let hasShield = false;
  for (const item of data.inventory ?? []) {
    if (!item.equipped) continue;
    const def = item.definition;
    if (def.filterType === "Armor") {
      if (def.armorTypeId === SHIELD_ARMOR) {
        hasShield = true;
      } else if (def.armorClass != null) {
        equippedArmor = item;
      }
    }
  }
  let ac;
  if (equippedArmor) {
    const baseAC = equippedArmor.definition.armorClass;
    const armorType = equippedArmor.definition.armorTypeId;
    if (armorType === LIGHT_ARMOR) {
      ac = baseAC + dexMod;
    } else if (armorType === MEDIUM_ARMOR) {
      ac = baseAC + Math.min(dexMod, 2);
    } else if (armorType === HEAVY_ARMOR) {
      ac = baseAC;
    } else {
      ac = baseAC + dexMod;
    }
  } else {
    ac = 10 + dexMod;
    for (const mod of allModifiers) {
      if (mod.type === "set" && mod.subType === "unarmored-armor-class" && mod.statId) {
        const bonusAbility = ABILITY_IDS[mod.statId];
        if (bonusAbility) {
          ac = 10 + dexMod + abilityMod(stats[bonusAbility]);
        }
      }
    }
  }
  if (hasShield) ac += 2;
  for (const mod of allModifiers) {
    if (mod.type === "bonus" && mod.subType === "armor-class" && mod.value) {
      ac += mod.value;
    }
  }
  return ac;
}
function mapToCharacterSheet(data) {
  const primaryClass = data.classes?.[0];
  const className = primaryClass?.definition?.name ?? "Unknown";
  const subclass = primaryClass?.subclassDefinition?.name ?? void 0;
  const level = data.classes?.reduce((sum, c) => sum + c.level, 0) ?? 1;
  const profBonus = getProficiencyBonus(level);
  const stats = {
    STR: getAbilityScore(data, 1),
    DEX: getAbilityScore(data, 2),
    CON: getAbilityScore(data, 3),
    INT: getAbilityScore(data, 4),
    WIS: getAbilityScore(data, 5),
    CHA: getAbilityScore(data, 6)
  };
  const conMod = abilityMod(stats.CON);
  const maxHp = data.baseHitPoints + conMod * level + (data.bonusHitPoints ?? 0);
  const allModifiers = [
    ...data.modifiers?.race ?? [],
    ...data.modifiers?.class ?? [],
    ...data.modifiers?.feat ?? [],
    ...data.modifiers?.item ?? [],
    ...data.modifiers?.background ?? []
  ];
  const proficientSaves = /* @__PURE__ */ new Set();
  const proficientSkills = /* @__PURE__ */ new Set();
  const expertiseSkills = /* @__PURE__ */ new Set();
  const proficiencyList = [];
  for (const mod of allModifiers) {
    if (mod.type === "proficiency") {
      if (mod.subType.endsWith("-saving-throws")) {
        const abilityPart = mod.subType.replace("-saving-throws", "");
        const ability = ABILITY_FULL_NAMES[abilityPart];
        if (ability) proficientSaves.add(ability);
      }
      if (mod.friendlySubtypeName && SKILL_ABILITY[mod.friendlySubtypeName] !== void 0) {
        proficientSkills.add(mod.friendlySubtypeName);
      }
      if (mod.friendlySubtypeName) {
        proficiencyList.push(mod.friendlySubtypeName);
      }
    }
    if (mod.type === "expertise") {
      if (mod.friendlySubtypeName && SKILL_ABILITY[mod.friendlySubtypeName] !== void 0) {
        expertiseSkills.add(mod.friendlySubtypeName);
      }
    }
  }
  const savingThrows = {};
  for (const [, name] of Object.entries(ABILITY_IDS)) {
    const mod = abilityMod(stats[name]);
    savingThrows[name] = mod + (proficientSaves.has(name) ? profBonus : 0);
  }
  const skills = {};
  for (const [skill, abilityId] of Object.entries(SKILL_ABILITY)) {
    const abilityName = ABILITY_IDS[abilityId];
    const mod = abilityMod(stats[abilityName]);
    let bonus = mod;
    if (proficientSkills.has(skill)) bonus += profBonus;
    if (expertiseSkills.has(skill)) bonus += profBonus;
    skills[skill] = bonus;
  }
  const ac = computeAC(data, stats, allModifiers);
  const speed = 30;
  const initiative = abilityMod(stats.DEX);
  const allSpells = [
    ...data.spells?.class ?? [],
    ...data.spells?.race ?? [],
    ...data.spells?.feat ?? [],
    ...data.spells?.item ?? [],
    ...data.spells?.background ?? []
  ];
  const spells = allSpells.map((s) => ({
    name: s.definition.name,
    level: s.definition.level,
    prepared: s.prepared || s.alwaysPrepared,
    source: ""
  }));
  const spellSlots = {};
  if (data.classSpells?.[0]?.spellSlots) {
    const slots = data.classSpells[0].spellSlots;
    for (let i = 1; i < slots.length; i++) {
      if (slots[i] > 0) {
        spellSlots[i] = { used: 0, max: slots[i] };
      }
    }
  }
  if (data.pactMagic) {
    for (const slot of data.pactMagic) {
      if (slot.available > 0) {
        const existing = spellSlots[slot.level];
        if (existing) {
          existing.max += slot.available;
          existing.used += slot.used;
        } else {
          spellSlots[slot.level] = { used: slot.used, max: slot.available };
        }
      }
    }
  }
  const equipment = (data.inventory ?? []).map((item) => ({
    name: item.definition.name,
    qty: item.quantity,
    weight: String(item.definition.weight ?? 0)
  }));
  const weapons = (data.inventory ?? []).filter((item) => item.definition.filterType === "Weapon").map((item) => ({
    name: item.definition.name,
    hit: "",
    damage: item.definition.damage?.diceString ?? "",
    notes: ""
  }));
  const feats = (data.feats ?? []).map((f) => f.definition.name);
  const hitDieSize = CLASS_HIT_DICE[className.toLowerCase()] ?? 8;
  return {
    name: data.name || "Unknown",
    race: data.race?.fullName || data.race?.baseRaceName || "Unknown",
    class: className,
    subclass,
    level,
    hp: {
      current: maxHp - (data.removedHitPoints ?? 0),
      max: maxHp,
      temp: data.temporaryHitPoints ?? 0
    },
    ac,
    speed,
    initiative,
    proficiencyBonus: profBonus,
    stats,
    savingThrows,
    skills,
    spellSlots,
    spells,
    feats,
    traits: [],
    proficiencies: [...new Set(proficiencyList)],
    equipment,
    weapons,
    currencies: data.currencies ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    defenses: "",
    senses: "",
    hitDice: `${level}d${hitDieSize}`
  };
}

// server/routes/character.ts
var characterRoutes = (0, import_express5.Router)();
characterRoutes.post("/save", async (req, res) => {
  try {
    const { campaign_id, character } = req.body;
    if (!campaign_id || !character) {
      res.status(400).json({ error: "Missing campaign_id or character data" });
      return;
    }
    const { error } = await supabaseAdmin.from("character_sheets").upsert(
      {
        campaign_id,
        data: character,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "campaign_id" }
    );
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from("campaigns").update({
      character_name: character.name,
      character_class: character.class,
      character_level: character.level,
      current_hp: character.hp.current,
      max_hp: character.hp.max
    }).eq("id", campaign_id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save character";
    res.status(500).json({ error: message });
  }
});
characterRoutes.patch("/:campaignId/rest", async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { type, hitDiceUsed = 0 } = req.body;
    if (!type || type !== "short" && type !== "long") {
      res.status(400).json({ error: "Invalid rest type" });
      return;
    }
    const { data: sheet, error: sheetError } = await supabaseAdmin.from("character_sheets").select("data").eq("campaign_id", campaignId).single();
    if (sheetError || !sheet?.data) {
      res.status(404).json({ error: "No character sheet found" });
      return;
    }
    const charData = sheet.data;
    const hp = charData.hp;
    const spellSlots = charData.spellSlots;
    const stats = charData.stats;
    const conMod = stats ? Math.floor(((stats.CON ?? 10) - 10) / 2) : 0;
    const charClass = (charData.class || "").toLowerCase();
    const CLASS_HIT_DICE2 = {
      barbarian: 12,
      fighter: 10,
      paladin: 10,
      ranger: 10,
      bard: 8,
      cleric: 8,
      druid: 8,
      monk: 8,
      rogue: 8,
      warlock: 8,
      sorcerer: 6,
      wizard: 6,
      artificer: 8,
      "blood hunter": 10
    };
    const hitDieSize = CLASS_HIT_DICE2[charClass] ?? 8;
    const rawHitDice = charData.hitDice;
    const level = charData.level ?? 1;
    if (!rawHitDice || typeof rawHitDice === "string" || !("current" in rawHitDice)) {
      charData.hitDice = { current: level, max: level };
    }
    const hd = charData.hitDice;
    let hpHealed = 0;
    if (type === "short") {
      const diceToUse = Math.min(hitDiceUsed, hd.current);
      for (let i = 0; i < diceToUse; i++) {
        const roll = Math.max(1, Math.floor(Math.random() * hitDieSize) + 1 + conMod);
        hpHealed += roll;
      }
      hp.current = Math.min(hp.max, hp.current + hpHealed);
      hd.current -= diceToUse;
    } else {
      hpHealed = hp.max - hp.current;
      hp.current = hp.max;
      hp.temp = 0;
      if (spellSlots) {
        for (const level2 of Object.keys(spellSlots)) {
          spellSlots[level2].used = 0;
        }
      }
      const recovered = Math.max(1, Math.floor(hd.max / 2));
      hd.current = Math.min(hd.max, hd.current + recovered);
      const conditions = [...charData.activeConditions ?? []];
      const exhIdx = conditions.indexOf("exhaustion");
      if (exhIdx >= 0) conditions.splice(exhIdx, 1);
      charData.activeConditions = conditions;
    }
    await supabaseAdmin.from("character_sheets").update({ data: charData, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("campaign_id", campaignId);
    await supabaseAdmin.from("campaigns").update({ current_hp: hp.current }).eq("id", campaignId);
    res.json({
      success: true,
      type,
      hpHealed,
      newHp: hp.current,
      hitDiceRemaining: hd.current
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to perform rest";
    res.status(500).json({ error: message });
  }
});
characterRoutes.post("/sync-dndb", async (req, res) => {
  try {
    const { url, campaign_id } = req.body;
    if (!url || !campaign_id) {
      res.status(400).json({ error: "Missing url or campaign_id" });
      return;
    }
    const characterId = extractCharacterId(url);
    if (!characterId) {
      res.status(400).json({ error: "Invalid D&D Beyond character URL. Expected format: dndbeyond.com/characters/12345" });
      return;
    }
    const character = await fetchDndbCharacter(characterId);
    const { error } = await supabaseAdmin.from("character_sheets").upsert(
      {
        campaign_id,
        data: { ...character, dndbeyondId: characterId },
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "campaign_id" }
    );
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    await supabaseAdmin.from("campaigns").update({
      character_name: character.name,
      character_class: character.class,
      character_level: character.level,
      current_hp: character.hp.current,
      max_hp: character.hp.max
    }).eq("id", campaign_id);
    res.json({ character: { ...character, dndbeyondId: characterId }, synced: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync from D&D Beyond";
    res.status(500).json({ error: message });
  }
});
characterRoutes.get("/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const { data, error } = await supabaseAdmin.from("character_sheets").select("data, updated_at").eq("campaign_id", campaignId).single();
  if (error || !data) {
    res.json({ character: null });
    return;
  }
  res.json({ character: data.data, updatedAt: data.updated_at });
});

// server/routes/oracle.ts
var import_express6 = require("express");

// src/lib/fate-chart.ts
var ODDS_ORDER = [
  "impossible",
  "nearly_impossible",
  "very_unlikely",
  "unlikely",
  "50/50",
  "likely",
  "very_likely",
  "nearly_certain",
  "certain"
];
var X = 0;
var FATE_CHART = [
  // Certain:          CF1         CF2         CF3         CF4         CF5         CF6         CF7         CF8         CF9
  /* Certain */
  [[10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98], [18, 90, 99], [19, 95, 100], [20, 99, X], [20, 99, X], [20, 99, X]],
  /* Nearly Certain */
  [[7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98], [18, 90, 99], [19, 95, 100], [20, 99, X], [20, 99, X]],
  /* Very Likely */
  [[5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98], [18, 90, 99], [19, 95, 100], [20, 99, X]],
  /* Likely */
  [[3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98], [18, 90, 99], [19, 95, 100]],
  /* 50/50 */
  [[2, 10, 83], [3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98], [18, 90, 99]],
  /* Unlikely */
  [[1, 5, 82], [2, 10, 83], [3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96], [17, 85, 98]],
  /* Very Unlikely */
  [[X, 1, 81], [1, 5, 82], [2, 10, 83], [3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94], [15, 75, 96]],
  /* Nearly Imp. */
  [[X, 1, 81], [X, 1, 81], [1, 5, 82], [2, 10, 83], [3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91], [13, 65, 94]],
  /* Impossible */
  [[X, 1, 81], [X, 1, 81], [X, 1, 81], [1, 5, 82], [2, 10, 83], [3, 15, 84], [5, 25, 86], [7, 35, 88], [10, 50, 91]]
];
function getCell(odds, chaosFactor) {
  const oddsIndex = ODDS_ORDER.indexOf(odds);
  const chartRow = 8 - oddsIndex;
  const chaosCol = Math.max(0, Math.min(8, chaosFactor - 1));
  return FATE_CHART[chartRow][chaosCol];
}
function rollFateChart(odds, chaosFactor) {
  const roll = Math.floor(Math.random() * 100) + 1;
  return resolveFateRoll(roll, odds, chaosFactor);
}
function resolveFateRoll(roll, odds, chaosFactor) {
  const [ey, yes, no] = getCell(odds, chaosFactor);
  let result;
  if (ey > 0 && roll <= ey) {
    result = "exceptional_yes";
  } else if (yes > 0 && roll <= yes) {
    result = "yes";
  } else if (no === 0 || roll <= no) {
    result = "no";
  } else {
    result = "exceptional_no";
  }
  const tens = Math.floor(roll / 10);
  const ones = roll % 10;
  const isDoubles = roll >= 11 && tens === ones;
  const randomEvent = isDoubles && ones <= chaosFactor;
  return { roll, result, odds, chaosFactor, randomEvent };
}
var EVENT_FOCUS_TABLE = [
  { min: 1, max: 5, focus: "Remote Event" },
  { min: 6, max: 10, focus: "Ambiguous Event" },
  { min: 11, max: 20, focus: "New NPC" },
  { min: 21, max: 40, focus: "NPC Action" },
  { min: 41, max: 45, focus: "NPC Negative" },
  { min: 46, max: 50, focus: "NPC Positive" },
  { min: 51, max: 55, focus: "Move Toward Thread" },
  { min: 56, max: 65, focus: "Move Away From Thread" },
  { min: 66, max: 70, focus: "Close Thread" },
  { min: 71, max: 80, focus: "PC Negative" },
  { min: 81, max: 85, focus: "PC Positive" },
  { min: 86, max: 100, focus: "Current Context" }
];
var ACTIONS_1 = [
  "Abandon",
  "Accompany",
  "Activate",
  "Agree",
  "Ambush",
  "Arrive",
  "Assist",
  "Attack",
  "Attain",
  "Bargain",
  "Befriend",
  "Bestow",
  "Betray",
  "Block",
  "Break",
  "Carry",
  "Celebrate",
  "Change",
  "Close",
  "Combine",
  "Communicate",
  "Conceal",
  "Continue",
  "Control",
  "Create",
  "Deceive",
  "Decrease",
  "Defend",
  "Delay",
  "Deny",
  "Depart",
  "Deposit",
  "Destroy",
  "Dispute",
  "Disrupt",
  "Distrust",
  "Divide",
  "Drop",
  "Easy",
  "Energize",
  "Escape",
  "Expose",
  "Fail",
  "Fight",
  "Flee",
  "Free",
  "Guide",
  "Harm",
  "Heal",
  "Hinder",
  "Imitate",
  "Imprison",
  "Increase",
  "Indulge",
  "Inform",
  "Inquire",
  "Inspect",
  "Invade",
  "Leave",
  "Lure",
  "Misuse",
  "Move",
  "Neglect",
  "Observe",
  "Open",
  "Oppose",
  "Overthrow",
  "Praise",
  "Proceed",
  "Protect",
  "Punish",
  "Pursue",
  "Recruit",
  "Refuse",
  "Release",
  "Relinquish",
  "Repair",
  "Repulse",
  "Return",
  "Reward",
  "Ruin",
  "Separate",
  "Start",
  "Stop",
  "Strange",
  "Struggle",
  "Succeed",
  "Support",
  "Suppress",
  "Take",
  "Threaten",
  "Transform",
  "Trap",
  "Travel",
  "Triumph",
  "Truce",
  "Trust",
  "Use",
  "Usurp",
  "Waste"
];
var ACTIONS_2 = [
  "Advantage",
  "Adversity",
  "Agreement",
  "Animal",
  "Attention",
  "Balance",
  "Battle",
  "Benefits",
  "Building",
  "Burden",
  "Bureaucracy",
  "Business",
  "Chaos",
  "Comfort",
  "Completion",
  "Conflict",
  "Cooperation",
  "Danger",
  "Defense",
  "Depletion",
  "Disadvantage",
  "Distraction",
  "Elements",
  "Emotion",
  "Enemy",
  "Energy",
  "Environment",
  "Expectation",
  "Exterior",
  "Extravagance",
  "Failure",
  "Fame",
  "Fear",
  "Freedom",
  "Friend",
  "Goal",
  "Group",
  "Health",
  "Hindrance",
  "Home",
  "Hope",
  "Idea",
  "Illness",
  "Illusion",
  "Individual",
  "Information",
  "Innocent",
  "Intellect",
  "Interior",
  "Investment",
  "Leadership",
  "Legal",
  "Location",
  "Military",
  "Misfortune",
  "Mundane",
  "Nature",
  "Needs",
  "News",
  "Normal",
  "Object",
  "Obscurity",
  "Official",
  "Opposition",
  "Outside",
  "Pain",
  "Path",
  "Peace",
  "People",
  "Personal",
  "Physical",
  "Plot",
  "Portal",
  "Possessions",
  "Poverty",
  "Power",
  "Prison",
  "Project",
  "Protection",
  "Reassurance",
  "Representative",
  "Riches",
  "Safety",
  "Strength",
  "Success",
  "Suffering",
  "Surprise",
  "Tactic",
  "Technology",
  "Tension",
  "Time",
  "Trial",
  "Value",
  "Vehicle",
  "Victory",
  "Vulnerability",
  "Weapon",
  "Weather",
  "Work",
  "Wound"
];
var DESCRIPTIONS_1 = [
  "Adventurously",
  "Aggressively",
  "Anxiously",
  "Awkwardly",
  "Beautifully",
  "Bleakly",
  "Boldly",
  "Bravely",
  "Busily",
  "Calmly",
  "Carefully",
  "Carelessly",
  "Cautiously",
  "Ceaselessly",
  "Cheerfully",
  "Combatively",
  "Coolly",
  "Crazily",
  "Curiously",
  "Dangerously",
  "Defiantly",
  "Deliberately",
  "Delicately",
  "Delightfully",
  "Dimly",
  "Efficiently",
  "Emotionally",
  "Energetically",
  "Enormously",
  "Enthusiastically",
  "Excitedly",
  "Fearfully",
  "Ferociously",
  "Fiercely",
  "Foolishly",
  "Fortunately",
  "Frantically",
  "Freely",
  "Frighteningly",
  "Fully",
  "Generously",
  "Gently",
  "Gladly",
  "Gracefully",
  "Gratefully",
  "Happily",
  "Hastily",
  "Healthily",
  "Helpfully",
  "Helplessly",
  "Hopelessly",
  "Innocently",
  "Intensely",
  "Interestingly",
  "Irritatingly",
  "Joyfully",
  "Kindly",
  "Lazily",
  "Lightly",
  "Loosely",
  "Loudly",
  "Lovingly",
  "Loyally",
  "Majestically",
  "Meaningfully",
  "Mechanically",
  "Mildly",
  "Miserably",
  "Mockingly",
  "Mysteriously",
  "Naturally",
  "Neatly",
  "Nicely",
  "Oddly",
  "Offensively",
  "Officially",
  "Partially",
  "Passively",
  "Peacefully",
  "Perfectly",
  "Playfully",
  "Politely",
  "Positively",
  "Powerfully",
  "Quaintly",
  "Quarrelsomely",
  "Quietly",
  "Roughly",
  "Rudely",
  "Ruthlessly",
  "Slowly",
  "Softly",
  "Strangely",
  "Swiftly",
  "Threateningly",
  "Timidly",
  "Very",
  "Violently",
  "Wildly",
  "Yieldingly"
];
var DESCRIPTIONS_2 = [
  "Abnormal",
  "Amusing",
  "Artificial",
  "Average",
  "Beautiful",
  "Bizarre",
  "Boring",
  "Bright",
  "Broken",
  "Clean",
  "Cold",
  "Colorful",
  "Colorless",
  "Comforting",
  "Creepy",
  "Cute",
  "Damaged",
  "Dark",
  "Defeated",
  "Dirty",
  "Disagreeable",
  "Dry",
  "Dull",
  "Empty",
  "Enormous",
  "Extraordinary",
  "Extravagant",
  "Faded",
  "Familiar",
  "Fancy",
  "Feeble",
  "Festive",
  "Flawless",
  "Forlorn",
  "Fragile",
  "Fragrant",
  "Fresh",
  "Full",
  "Glorious",
  "Graceful",
  "Hard",
  "Harsh",
  "Healthy",
  "Heavy",
  "Historical",
  "Horrible",
  "Important",
  "Interesting",
  "Juvenile",
  "Lacking",
  "Large",
  "Lavish",
  "Lean",
  "Less",
  "Lethal",
  "Lively",
  "Lonely",
  "Lovely",
  "Magnificent",
  "Mature",
  "Messy",
  "Mighty",
  "Military",
  "Modern",
  "Mundane",
  "Mysterious",
  "Natural",
  "Normal",
  "Odd",
  "Old",
  "Pale",
  "Peaceful",
  "Petite",
  "Plain",
  "Poor",
  "Powerful",
  "Protective",
  "Quaint",
  "Rare",
  "Reassuring",
  "Remarkable",
  "Rotten",
  "Rough",
  "Ruined",
  "Rustic",
  "Scary",
  "Shocking",
  "Simple",
  "Small",
  "Smooth",
  "Soft",
  "Strong",
  "Stylish",
  "Unpleasant",
  "Valuable",
  "Vibrant",
  "Warm",
  "Watery",
  "Weak",
  "Young"
];
function rollRandomEvent() {
  const focusRoll = Math.floor(Math.random() * 100) + 1;
  const action1 = ACTIONS_1[Math.floor(Math.random() * 100)];
  const action2 = ACTIONS_2[Math.floor(Math.random() * 100)];
  const desc1 = DESCRIPTIONS_1[Math.floor(Math.random() * 100)];
  const desc2 = DESCRIPTIONS_2[Math.floor(Math.random() * 100)];
  const focusEntry = EVENT_FOCUS_TABLE.find(
    (e) => focusRoll >= e.min && focusRoll <= e.max
  );
  return {
    focus: focusEntry.focus,
    action: `${action1} / ${action2}`,
    subject: `${desc1} / ${desc2}`
  };
}

// server/routes/oracle.ts
var oracleRoutes = (0, import_express6.Router)();
oracleRoutes.post("/fate", (req, res) => {
  const { odds, chaosFactor } = req.body;
  if (!odds || !ODDS_ORDER.includes(odds)) {
    res.status(400).json({ error: `Invalid odds. Must be one of: ${ODDS_ORDER.join(", ")}` });
    return;
  }
  const cf = Math.max(1, Math.min(9, parseInt(chaosFactor, 10) || 5));
  const result = rollFateChart(odds, cf);
  res.json(result);
});
oracleRoutes.post("/event", (_req, res) => {
  const event = rollRandomEvent();
  res.json(event);
});

// server/routes/npc.ts
var import_express7 = require("express");
var npcRoutes = (0, import_express7.Router)();
npcRoutes.post("/:id/ai-update", async (req, res) => {
  const { id } = req.params;
  const { context, user_id } = req.body;
  const provider = resolveProvider(user_id);
  const { data: npc, error } = await supabaseAdmin.from("npcs").select("*").eq("id", id).single();
  if (error || !npc) {
    res.status(404).json({ error: "NPC not found" });
    return;
  }
  const text = await createCompletion({
    provider,
    maxTokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are analyzing an NPC in a D&D campaign. Based on the context provided, update the NPC's information.

CURRENT NPC DATA:
Name: ${npc.name}
Race: ${npc.race || "Unknown"}
Occupation: ${npc.occupation || "Unknown"}
Disposition: ${npc.disposition}
Description: ${npc.description || "None"}
Location: ${npc.location || "Unknown"}
Backstory: ${npc.backstory || "None"}
Relationship to player: ${npc.relationship || "None"}
Alive: ${npc.is_alive}
Notes: ${npc.notes || "None"}

CONTEXT / RECENT EVENTS:
${context}

Respond with ONLY a JSON object containing the fields that should be updated. Only include fields that have meaningfully changed based on the context. Valid fields: description, disposition (friendly/neutral/hostile), location, backstory, relationship, notes, is_alive, occupation.

Example: {"disposition": "friendly", "relationship": "The party saved her village, she now considers them allies", "location": "Silverymoon marketplace"}`
      }
    ]
  });
  let updates;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    updates = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    res.status(400).json({ error: "Failed to parse AI response" });
    return;
  }
  const allowedFields = ["description", "disposition", "location", "backstory", "relationship", "notes", "is_alive", "occupation"];
  const filtered = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) filtered[key] = value;
  }
  if (Object.keys(filtered).length === 0) {
    res.json({ npc, updates: {} });
    return;
  }
  const { data: updated } = await supabaseAdmin.from("npcs").update(filtered).eq("id", id).select().single();
  res.json({ npc: updated, updates: filtered });
});

// server/routes/tts.ts
var import_express8 = require("express");
var INWORLD_BASE = "https://api.inworld.ai";
var ttsRoutes = (0, import_express8.Router)();
var DEFAULT_VOICE_ID = "lime-fern-6875__amelia_tyler_bg3";
var DEFAULT_MODEL_ID = "inworld-tts-2";
function resolveVoiceId(speaker, overrideVoiceId) {
  if (overrideVoiceId) return overrideVoiceId;
  return DEFAULT_VOICE_ID;
}
var STEERING_RULES = [
  { pattern: /\bwhisper|hush|quiet(ly)?|murmur|under .* breath\b/i, tag: "[whisper in a hushed, secretive tone]" },
  { pattern: /\bscream|shout|roar|bellow|yell|cries out\b/i, tag: "[loud and forceful with intensity]" },
  { pattern: /\btremble|shak(e|ing|y)|fear|terrif|dread|horror|chill.* spine\b/i, tag: "[say with a trembling, fearful voice]" },
  { pattern: /\blaugh|chuckle|grin|smirk|amuse|giggle\b/i, tag: "[say with warmth and a hint of amusement]" },
  { pattern: /\bsob|weep|tear|cry|grief|mourn|sorrow\b/i, tag: "[say sadly with deliberate pauses in a low, heavy voice]" },
  { pattern: /\brage|fury|furious|anger|wrath|snarl\b/i, tag: "[speak as if barely holding back rage, forcing every word through gritted teeth]" },
  { pattern: /\bthunder|crash|explo|rumble|quake|erupts?\b/i, tag: "[deep and booming with dramatic weight]" },
  { pattern: /\bmyster|shadow|dark(ness|ened)?|omen|forebod|eerie|uncanny\b/i, tag: "[slow and ominous with an unsettling edge]" },
  { pattern: /\bsacred|holy|divine|prayer|bless|celestial|radian(t|ce)\b/i, tag: "[reverent and solemn with quiet awe]" },
  { pattern: /\btavern|feast|drink|ale|cheer|celebrat|toast\b/i, tag: "[warm and jovial like a storyteller by the hearth]" },
  { pattern: /\bsteel|blade|sword|clash|strike|combat|battle|fight\b/i, tag: "[urgent and sharp with rising intensity]" },
  { pattern: /\bdead|death|dying|corpse|grave|tomb|lifeless\b/i, tag: "[grave and measured, each word weighted by solemnity]" },
  { pattern: /\bwonder|awe|marvel|breathtak|magnificent|vast\b/i, tag: "[filled with wonder and quiet amazement]" }
];
function addSteeringTags(text) {
  const lower = text.toLowerCase();
  let steered = text.replace(/\b(laughs?|chuckles?)\b/gi, "[laugh]").replace(/\b(sighs?|exhales? (?:deeply|slowly|heavily))\b/gi, "[sigh]").replace(/\b(clears? (?:his|her|their|its) throat)\b/gi, "[clear throat]").replace(/\b(coughs?|coughing)\b/gi, "[cough]").replace(/\b(yawns?)\b/gi, "[yawn]");
  for (const rule of STEERING_RULES) {
    if (rule.pattern.test(lower)) {
      steered = `${rule.tag} ${steered}`;
      break;
    }
  }
  return steered;
}
async function inworldStream(text, voiceId, res, temperature) {
  const response = await fetch(`${INWORLD_BASE}/tts/v1/voice:stream`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${process.env.INWORLD_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      voiceId,
      modelId: DEFAULT_MODEL_ID,
      audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24e3 },
      ...temperature != null && { temperature }
    })
  });
  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message || err.detail || "Inworld TTS stream failed");
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Transfer-Encoding", "chunked");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.result?.audioContent) {
          const chunk = Buffer.from(data.result.audioContent, "base64");
          res.write(chunk);
        }
      } catch {
      }
    }
  }
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      if (data.result?.audioContent) {
        res.write(Buffer.from(data.result.audioContent, "base64"));
      }
    } catch {
    }
  }
  res.end();
}
async function inworldSynth(text, voiceId, res, temperature) {
  const response = await withRetry(
    () => fetch(`${INWORLD_BASE}/tts/v1/voice`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${process.env.INWORLD_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        voiceId,
        modelId: DEFAULT_MODEL_ID,
        audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24e3 },
        ...temperature != null && { temperature }
      })
    }),
    { maxRetries: 2, timeoutMs: 3e4 }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message || err.detail || "Inworld TTS failed");
  }
  const data = await response.json();
  const audioBuffer = Buffer.from(data.audioContent, "base64");
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Length", audioBuffer.length);
  res.send(audioBuffer);
}
async function inworldVoices(res) {
  const response = await fetch(`${INWORLD_BASE}/voices/v1/voices`, {
    headers: {
      "Authorization": `Basic ${process.env.INWORLD_API_KEY}`
    }
  });
  if (!response.ok) throw new Error("Failed to fetch Inworld voices");
  const data = await response.json();
  const voices = (data.voices || []).map((v) => ({
    id: v.voiceId,
    name: v.displayName || v.voiceId,
    description: [v.gender, v.accent].filter(Boolean).join(" \xB7 ")
  }));
  res.json({ voices });
}
ttsRoutes.get("/voices", async (_req, res) => {
  try {
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: "No INWORLD_API_KEY configured" });
      return;
    }
    await inworldVoices(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch voices";
    res.status(500).json({ error: message });
  }
});
ttsRoutes.post("/stream", async (req, res) => {
  try {
    const { text, speaker, voiceId: overrideVoiceId, temperature } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text" });
      return;
    }
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: "No INWORLD_API_KEY configured" });
      return;
    }
    const voiceId = resolveVoiceId(speaker, overrideVoiceId);
    await inworldStream(addSteeringTags(text), voiceId, res, temperature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS stream failed";
    console.error("TTS stream error:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
});
ttsRoutes.post("/", async (req, res) => {
  try {
    const { text, speaker, voiceId: overrideVoiceId, temperature } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Missing text" });
      return;
    }
    if (!process.env.INWORLD_API_KEY) {
      res.status(500).json({ error: "No INWORLD_API_KEY configured" });
      return;
    }
    const voiceId = resolveVoiceId(speaker, overrideVoiceId);
    await inworldSynth(addSteeringTags(text), voiceId, res, temperature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("TTS error:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
});

// server/routes/image.ts
var import_express9 = require("express");
var import_openai4 = __toESM(require("openai"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var openai4 = new import_openai4.default({ apiKey: process.env.OPENAI_API_KEY });
var imageRoutes = (0, import_express9.Router)();
var SESSION_IMAGE_COUNTS = /* @__PURE__ */ new Map();
var MAX_IMAGES_PER_SESSION = 10;
function hashPrompt(prompt) {
  return import_crypto2.default.createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}
function buildNpcPortraitPrompt(npc) {
  const parts = [`Fantasy character portrait of ${npc.name}`];
  if (npc.race || npc.occupation) {
    parts[0] += `, a ${[npc.race, npc.occupation].filter(Boolean).join(" ")}`;
  }
  if (npc.description) parts.push(npc.description);
  parts.push("Style: detailed fantasy oil painting, dramatic lighting, dark background.");
  parts.push("Do not include any text, labels, or watermarks. Square format, bust portrait.");
  return parts.join(". ");
}
function buildLocationPrompt(location) {
  const parts = [`Fantasy environment: ${location.name}`];
  if (location.description) parts.push(location.description);
  if (location.timeOfDay) parts.push(`Time of day: ${location.timeOfDay}`);
  if (location.weather) parts.push(`Weather: ${location.weather}`);
  parts.push("Style: detailed fantasy concept art, atmospheric, cinematic lighting.");
  parts.push("Do not include any text, labels, or watermarks. Wide format landscape.");
  return parts.join(". ");
}
async function getCachedImage(campaignId, promptHash) {
  const { data } = await supabaseAdmin.from("generated_images").select("public_url").eq("campaign_id", campaignId).eq("prompt_hash", promptHash).single();
  return data?.public_url ?? null;
}
async function generateAndStore(campaignId, prompt, imageType, size = "1024x1024") {
  const promptHash = hashPrompt(prompt);
  const cached = await getCachedImage(campaignId, promptHash);
  if (cached) return cached;
  const response = await withRetry(
    () => openai4.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size,
      quality: "low"
    }),
    { maxRetries: 2, timeoutMs: 6e4 }
  );
  const b64 = response.data[0].b64_json;
  if (!b64) throw new Error("No image data returned");
  const buffer = Buffer.from(b64, "base64");
  const storagePath = `${campaignId}/${imageType}/${promptHash}.png`;
  const { error: uploadError } = await supabaseAdmin.storage.from("generated-images").upload(storagePath, buffer, {
    contentType: "image/png",
    upsert: true
  });
  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
  const { data: urlData } = supabaseAdmin.storage.from("generated-images").getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
  await supabaseAdmin.from("generated_images").upsert({
    campaign_id: campaignId,
    prompt_hash: promptHash,
    image_type: imageType,
    storage_path: storagePath,
    public_url: publicUrl
  }, { onConflict: "campaign_id,prompt_hash" });
  return publicUrl;
}
function checkRateLimit(sessionId) {
  const count = SESSION_IMAGE_COUNTS.get(sessionId) ?? 0;
  if (count >= MAX_IMAGES_PER_SESSION) return false;
  SESSION_IMAGE_COUNTS.set(sessionId, count + 1);
  return true;
}
imageRoutes.post("/generate", async (req, res) => {
  try {
    const { campaign_id, session_id, type, data } = req.body;
    if (!campaign_id || !type) {
      res.status(400).json({ error: "Missing campaign_id or type" });
      return;
    }
    if (type !== "npc_portrait" && type !== "location") {
      res.status(400).json({ error: "Invalid type. Must be npc_portrait or location." });
      return;
    }
    const { data: campaign } = await supabaseAdmin.from("campaigns").select("image_generation_enabled").eq("id", campaign_id).single();
    if (!campaign?.image_generation_enabled) {
      res.status(200).json({ url: null, reason: "disabled" });
      return;
    }
    if (session_id && !checkRateLimit(session_id)) {
      res.status(200).json({ url: null, reason: "rate_limited" });
      return;
    }
    let prompt;
    let size = "1024x1024";
    const imageType = type;
    if (type === "npc_portrait") {
      prompt = buildNpcPortraitPrompt(data);
    } else {
      prompt = buildLocationPrompt(data);
      size = "1536x1024";
    }
    const url = await generateAndStore(campaign_id, prompt, imageType, size);
    res.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    console.error("Image generation error:", message);
    res.status(500).json({ error: message });
  }
});
imageRoutes.post("/npc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { session_id } = req.body;
    const { data: npc, error } = await supabaseAdmin.from("npcs").select("*").eq("id", id).single();
    if (error || !npc) {
      res.status(404).json({ error: "NPC not found" });
      return;
    }
    if (npc.portrait_url) {
      res.json({ url: npc.portrait_url });
      return;
    }
    const { data: campaign } = await supabaseAdmin.from("campaigns").select("image_generation_enabled").eq("id", npc.campaign_id).single();
    if (!campaign?.image_generation_enabled) {
      res.json({ url: null, reason: "disabled" });
      return;
    }
    if (session_id && !checkRateLimit(session_id)) {
      res.json({ url: null, reason: "rate_limited" });
      return;
    }
    const prompt = buildNpcPortraitPrompt(npc);
    const url = await generateAndStore(npc.campaign_id, prompt, "npc_portrait");
    await supabaseAdmin.from("npcs").update({ portrait_url: url }).eq("id", id);
    res.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portrait generation failed";
    console.error("NPC portrait error:", message);
    res.status(500).json({ error: message });
  }
});

// server/routes/location.ts
var import_express10 = require("express");
var locationRoutes = (0, import_express10.Router)();
locationRoutes.get("/list/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const { data, error } = await supabaseAdmin.from("world_locations").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ locations: data });
});
locationRoutes.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from("world_locations").select("*").eq("id", id).single();
  if (error) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  const { data: children } = await supabaseAdmin.from("world_locations").select("id, name, type, discovered").eq("parent_id", id);
  res.json({ location: data, children: children || [] });
});
locationRoutes.post("/", async (req, res) => {
  const { campaign_id, name, type, parent_id, description, coordinates_x, coordinates_y, terrain, danger_level } = req.body;
  if (!campaign_id || !name) {
    res.status(400).json({ error: "Missing campaign_id or name" });
    return;
  }
  const { data, error } = await supabaseAdmin.from("world_locations").insert({
    campaign_id,
    name,
    type: type || "building",
    parent_id: parent_id || null,
    description: description || null,
    coordinates_x: coordinates_x ?? Math.random() * 800 + 100,
    coordinates_y: coordinates_y ?? Math.random() * 600 + 100,
    terrain: terrain || null,
    danger_level: danger_level ?? 1,
    discovered: true,
    visit_count: 0
  }).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ location: data });
});
locationRoutes.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabaseAdmin.from("world_locations").update(updates).eq("id", id).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ location: data });
});
locationRoutes.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from("world_locations").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});
locationRoutes.post("/:id/connect/:otherId", async (req, res) => {
  const { id, otherId } = req.params;
  const [locA, locB] = await Promise.all([
    supabaseAdmin.from("world_locations").select("id, connected_locations").eq("id", id).single(),
    supabaseAdmin.from("world_locations").select("id, connected_locations").eq("id", otherId).single()
  ]);
  if (!locA.data || !locB.data) {
    res.status(404).json({ error: "One or both locations not found" });
    return;
  }
  const aConns = locA.data.connected_locations || [];
  const bConns = locB.data.connected_locations || [];
  const updates = [];
  if (!aConns.includes(otherId)) {
    updates.push(
      supabaseAdmin.from("world_locations").update({ connected_locations: [...aConns, otherId] }).eq("id", id)
    );
  }
  if (!bConns.includes(id)) {
    updates.push(
      supabaseAdmin.from("world_locations").update({ connected_locations: [...bConns, id] }).eq("id", otherId)
    );
  }
  await Promise.all(updates);
  res.json({ success: true });
});

// server/routes/faction.ts
var import_express11 = require("express");
var factionRoutes = (0, import_express11.Router)();
factionRoutes.get("/list/:campaignId", async (req, res) => {
  const { campaignId } = req.params;
  const [factionsResult, reputationResult] = await Promise.all([
    supabaseAdmin.from("factions").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true }),
    supabaseAdmin.from("faction_reputation").select("*").eq("campaign_id", campaignId)
  ]);
  if (factionsResult.error) {
    res.status(500).json({ error: factionsResult.error.message });
    return;
  }
  res.json({
    factions: factionsResult.data || [],
    reputations: reputationResult.data || []
  });
});
factionRoutes.post("/", async (req, res) => {
  const { campaign_id, name, description, alignment } = req.body;
  if (!campaign_id || !name) {
    res.status(400).json({ error: "Missing campaign_id or name" });
    return;
  }
  const { data: faction, error } = await supabaseAdmin.from("factions").insert({
    campaign_id,
    name,
    description: description || null,
    alignment: alignment || null
  }).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  await supabaseAdmin.from("faction_reputation").insert({
    campaign_id,
    faction_id: faction.id,
    score: 50
  });
  res.json({ faction });
});
factionRoutes.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabaseAdmin.from("factions").update(updates).eq("id", id).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ faction: data });
});
factionRoutes.patch("/:id/reputation", async (req, res) => {
  const { id } = req.params;
  const { change, campaign_id } = req.body;
  if (change === void 0 || !campaign_id) {
    res.status(400).json({ error: "Missing change or campaign_id" });
    return;
  }
  const { data: rep } = await supabaseAdmin.from("faction_reputation").select("score").eq("campaign_id", campaign_id).eq("faction_id", id).single();
  if (!rep) {
    res.status(404).json({ error: "Reputation record not found" });
    return;
  }
  const newScore = Math.max(0, Math.min(100, rep.score + change));
  const { data, error } = await supabaseAdmin.from("faction_reputation").update({ score: newScore }).eq("campaign_id", campaign_id).eq("faction_id", id).select().single();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ reputation: data });
});

// server/routes/travel.ts
var import_express12 = require("express");
var travelRoutes = (0, import_express12.Router)();
var DANGER_TO_ODDS = {
  1: "Impossible",
  2: "Very Unlikely",
  3: "Unlikely",
  4: "50/50",
  5: "Likely"
};
var TERRAIN_SPEED = {
  plains: 1,
  forest: 1.5,
  mountain: 2,
  desert: 1.8,
  swamp: 2,
  coastal: 1.2,
  underground: 1.5,
  urban: 0.5,
  arctic: 1.8
};
travelRoutes.post("/start", async (req, res) => {
  const { campaign_id, from_id, to_id, session_id } = req.body;
  if (!campaign_id || !from_id || !to_id) {
    res.status(400).json({ error: "Missing campaign_id, from_id, or to_id" });
    return;
  }
  const [fromResult, toResult, campaignResult] = await Promise.all([
    supabaseAdmin.from("world_locations").select("*").eq("id", from_id).single(),
    supabaseAdmin.from("world_locations").select("*").eq("id", to_id).single(),
    supabaseAdmin.from("campaigns").select("chaos_factor").eq("id", campaign_id).single()
  ]);
  if (!fromResult.data || !toResult.data) {
    res.status(404).json({ error: "One or both locations not found" });
    return;
  }
  const from = fromResult.data;
  const to = toResult.data;
  const chaosFactor = campaignResult.data?.chaos_factor ?? 5;
  const dx = to.coordinates_x - from.coordinates_x;
  const dy = to.coordinates_y - from.coordinates_y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const terrainMod = TERRAIN_SPEED[to.terrain || "plains"] || 1;
  const durationHours = Math.max(0.5, Math.round(distance / 100 * terrainMod * 2) / 2);
  const dangerLevel = Math.max(from.danger_level, to.danger_level);
  const odds = DANGER_TO_ODDS[dangerLevel] || "Unlikely";
  const fateResult = rollFateChart(odds, chaosFactor);
  const encounterTriggered = fateResult.answer === "Exceptional Yes" || fateResult.answer === "Yes";
  let encounter = null;
  if (encounterTriggered) {
    const event = rollRandomEvent();
    encounter = {
      type: event.focus,
      action: event.action,
      subject: event.subject
    };
  }
  await supabaseAdmin.from("travel_events").insert({
    campaign_id,
    session_id: session_id || null,
    from_location_id: from_id,
    to_location_id: to_id,
    encounter_type: encounterTriggered ? "combat" : "peaceful",
    description: encounter ? `${encounter.type}: ${encounter.action} ${encounter.subject}` : "Uneventful journey"
  });
  await supabaseAdmin.from("campaigns").update({ current_location_id: to_id }).eq("id", campaign_id);
  await supabaseAdmin.from("world_locations").update({
    discovered: true,
    visit_count: to.visit_count + 1
  }).eq("id", to_id);
  res.json({
    duration: durationHours,
    distance: Math.round(distance),
    terrain: to.terrain || "plains",
    dangerLevel,
    encounter: {
      triggered: encounterTriggered,
      event: encounter,
      fateResult
    },
    from: { id: from.id, name: from.name },
    to: { id: to.id, name: to.name }
  });
});

// server/routes/memory.ts
var import_express13 = require("express");
var memoryRoutes = (0, import_express13.Router)();
memoryRoutes.get("/list/:campaignId", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("campaign_memories").select("*").eq("campaign_id", req.params.campaignId).order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ memories: data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to list memories" });
  }
});
memoryRoutes.post("/", async (req, res) => {
  try {
    const { campaign_id, content, category, importance, source } = req.body;
    if (!campaign_id || !content) {
      res.status(400).json({ error: "Missing campaign_id or content" });
      return;
    }
    const { data, error } = await supabaseAdmin.from("campaign_memories").insert({
      campaign_id,
      content,
      category: category || "plot",
      importance: importance || "medium",
      source: source || "user"
    }).select().single();
    if (error) throw error;
    res.json({ memory: data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to create memory" });
  }
});
memoryRoutes.patch("/:id", async (req, res) => {
  try {
    const { content, category, importance } = req.body;
    const updates = {};
    if (content !== void 0) updates.content = content;
    if (category !== void 0) updates.category = category;
    if (importance !== void 0) updates.importance = importance;
    const { data, error } = await supabaseAdmin.from("campaign_memories").update(updates).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ memory: data });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to update memory" });
  }
});
memoryRoutes.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabaseAdmin.from("campaign_memories").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete memory" });
  }
});

// server/routes/tavern.ts
var import_express14 = require("express");
var tavernRoutes = (0, import_express14.Router)();
tavernRoutes.post("/generate", async (req, res) => {
  try {
    const { campaign_id, region_name, user_id } = req.body;
    if (!campaign_id) {
      res.status(400).json({ error: "Missing campaign_id" });
      return;
    }
    const provider = resolveProvider(user_id);
    const { data: campaign } = await supabaseAdmin.from("campaigns").select("setting").eq("id", campaign_id).single();
    const setting = campaign?.setting || "Standard fantasy";
    const region = region_name || setting;
    const text = await createCompletion({
      provider,
      maxTokens: 1024,
      messages: [{
        role: "user",
        content: `Generate a unique fantasy tavern for the region "${region}" in a ${setting} setting. Include:

* A creative name with a connection to the region
* A short atmospheric description (2-3 sentences)
* An innkeeper: name, race, personality trait
* 2-3 guests, each with: name, race, occupation, and one rumor or secret
* A house specialty (food or drink)
* An optional ongoing event or activity (or null)

Return ONLY valid JSON with this exact structure, no other text:
{
  "name": "string",
  "description": "string",
  "host": { "name": "string", "race": "string", "personality": "string" },
  "guests": [{ "name": "string", "race": "string", "occupation": "string", "rumor": "string" }],
  "specialty": "string",
  "event": "string or null"
}`
      }]
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(500).json({ error: "Failed to parse tavern response" });
      return;
    }
    const tavern = JSON.parse(jsonMatch[0]);
    res.json({ tavern });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate tavern" });
  }
});

// server/routes/loot.ts
var import_express15 = require("express");
var lootRoutes = (0, import_express15.Router)();
function determineLootQuality(fateResult) {
  switch (fateResult) {
    case "exceptional_yes":
      return { rarityPool: ["rare", "very_rare", "legendary"], itemCount: 3, currencyMultiplier: 3 };
    case "yes":
      return { rarityPool: ["uncommon", "rare"], itemCount: 2, currencyMultiplier: 1.5 };
    case "no":
      return { rarityPool: ["common", "uncommon"], itemCount: 1, currencyMultiplier: 1 };
    case "exceptional_no":
      return { rarityPool: ["common"], itemCount: 0, currencyMultiplier: 0.5 };
  }
}
lootRoutes.post("/generate", async (req, res) => {
  try {
    const { campaign_id, monster_name, monster_cr, context, chaos_factor = 5, user_id } = req.body;
    const provider = resolveProvider(user_id);
    if (!campaign_id || !monster_name) {
      res.status(400).json({ error: "Missing campaign_id or monster_name" });
      return;
    }
    const fateRoll = Math.floor(Math.random() * 100) + 1;
    const fateResult = resolveFateRoll(fateRoll, "50/50", chaos_factor);
    const lootQuality = determineLootQuality(fateResult.result);
    let ragContext = "";
    try {
      const embeddingResponse = await withRetry(
        () => openai3.embeddings.create({
          model: "text-embedding-3-small",
          input: `${monster_name} loot treasure drops items CR ${monster_cr ?? ""}`
        }),
        { maxRetries: 2, timeoutMs: 15e3 }
      );
      const queryEmbedding = embeddingResponse.data[0].embedding;
      const { data: ragResults } = await supabaseAdmin.rpc("match_documents", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_campaign_id: campaign_id,
        match_count: 3
      });
      if (ragResults?.length) {
        ragContext = ragResults.map((r) => r.content).join("\n\n");
      }
    } catch {
    }
    const prompt = `Generate loot for defeating a ${monster_name}${monster_cr ? ` (CR ${monster_cr})` : ""}.

Fate Chart result: ${fateResult.result} (this determines loot quality).
Maximum rarity pool: ${lootQuality.rarityPool.join(", ")}
Number of items to generate: ${lootQuality.itemCount}
Currency multiplier: ${lootQuality.currencyMultiplier}x

${ragContext ? `SOURCE MATERIAL for reference:
${ragContext}
` : ""}
${context ? `Scene context: ${context}
` : ""}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "items": [
    {
      "name": "item name",
      "category": "weapon|armor|potion|scroll|gear|treasure|tool|other",
      "rarity": "common|uncommon|rare|very_rare|legendary",
      "description": "evocative 1-2 sentence description",
      "weight": 0,
      "value_gp": 0,
      "value_sp": 0,
      "value_cp": 0,
      "properties": {}
    }
  ],
  "currency": { "gp": 0, "sp": 0, "cp": 0 },
  "narrative": "A dramatic 2-3 sentence description of finding the loot, written in second person."
}

Rules:
- Items must be appropriate for the monster type and CR
- Rarity must not exceed the maximum rarity pool
- Currency should be appropriate for the CR (use D&D 5e treasure tables as reference)
- Apply the currency multiplier to the base amount
- For weapons, include damage in properties: { "damage": "1d8", "damageType": "slashing" }
- For armor, include AC in properties: { "ac": 14, "type": "medium" }
- For potions/scrolls, include effect: { "effect": "description" }
- The narrative should feel like a discovery moment \u2014 dramatic and immersive
- Weight in pounds, following D&D 5e standards`;
    const text = await withRetry(
      () => createCompletion({
        provider,
        maxTokens: 1024,
        temperature: 0.8,
        messages: [{ role: "user", content: prompt }]
      }),
      { maxRetries: 2, timeoutMs: 3e4 }
    );
    const lootData = { ...JSON.parse(text), fateResult: fateResult.result };
    if (lootData.items.length > 0) {
      const inserts = lootData.items.map((item) => ({
        campaign_id,
        name: item.name,
        category: item.category,
        description: item.description,
        rarity: item.rarity,
        weight: item.weight,
        value_gp: item.value_gp,
        value_sp: item.value_sp,
        value_cp: item.value_cp,
        properties: item.properties,
        quantity: 1
      }));
      await supabaseAdmin.from("inventory_items").insert(inserts);
    }
    if (lootData.currency.gp > 0 || lootData.currency.sp > 0 || lootData.currency.cp > 0) {
      const { data: existing } = await supabaseAdmin.from("campaign_currency").select("*").eq("campaign_id", campaign_id).single();
      if (existing) {
        await supabaseAdmin.from("campaign_currency").update({
          gp: existing.gp + lootData.currency.gp,
          sp: existing.sp + lootData.currency.sp,
          cp: existing.cp + lootData.currency.cp,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("campaign_id", campaign_id);
      } else {
        await supabaseAdmin.from("campaign_currency").insert({ campaign_id, ...lootData.currency });
      }
    }
    res.json(lootData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// server/routes/rulebook.ts
var import_express16 = require("express");
var import_multer2 = __toESM(require("multer"), 1);
var upload2 = (0, import_multer2.default)({
  storage: import_multer2.default.memoryStorage(),
  limits: { fileSize: 400 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});
var rulebookRoutes = (0, import_express16.Router)();
rulebookRoutes.post(
  "/upload",
  (req, res, next) => {
    upload2.single("file")(req, res, (err) => {
      if (err) {
        const msg = err instanceof import_multer2.default.MulterError && err.code === "LIMIT_FILE_SIZE" ? "File too large (max 400MB)" : err.message || "Upload error";
        res.status(413).json({ error: msg });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file = req.file;
      const userId = req.body.user_id;
      if (!file || !userId) {
        res.status(400).json({ error: "Missing file or user_id" });
        return;
      }
      const storagePath = `${userId}/rulebooks/${Date.now()}-${file.originalname}`;
      let storageUploaded = false;
      const { error: storageError } = await supabaseAdmin.storage.from("pdfs").upload(storagePath, file.buffer, { contentType: "application/pdf" });
      if (storageError) {
        console.warn(`Storage upload skipped for ${file.originalname}: ${storageError.message}`);
      } else {
        storageUploaded = true;
      }
      const { data: record, error: insertError } = await supabaseAdmin.from("rulebooks").insert({
        user_id: userId,
        filename: file.originalname,
        storage_path: storageUploaded ? storagePath : `local-only/${file.originalname}`,
        status: "processing"
      }).select().single();
      if (insertError || !record) {
        res.status(500).json({ error: `DB insert failed: ${insertError?.message}` });
        return;
      }
      const msg = storageUploaded ? "Upload started, processing in background" : "File too large for storage \u2014 indexing directly";
      res.json({ rulebook: record, message: msg });
      processInBackground2(record.id, file.buffer, file.originalname, userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }
);
async function processInBackground2(rulebookId, buffer, filename, userId) {
  try {
    console.log(`Processing rulebook: ${filename}`);
    const chunks = await parsePdfToChunks(buffer, filename);
    console.log(`Parsed ${chunks.length} chunks from rulebook ${filename}`);
    await embedAndStoreRulebook(chunks, rulebookId, userId);
    console.log(`Embedded and stored ${chunks.length} chunks for rulebook ${filename}`);
    await supabaseAdmin.from("rulebooks").update({ status: "indexed" }).eq("id", rulebookId);
  } catch (err) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`Failed to process rulebook ${filename}:`, message);
    await supabaseAdmin.from("rulebooks").update({ status: "error" }).eq("id", rulebookId);
  }
}
rulebookRoutes.get("/list/:userId", async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabaseAdmin.from("rulebooks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ rulebooks: data });
});
rulebookRoutes.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { data: rulebook, error: fetchError } = await supabaseAdmin.from("rulebooks").select("storage_path").eq("id", id).single();
  if (fetchError || !rulebook) {
    res.status(404).json({ error: "Rulebook not found" });
    return;
  }
  await supabaseAdmin.storage.from("pdfs").remove([rulebook.storage_path]);
  const { error } = await supabaseAdmin.from("rulebooks").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ success: true });
});

// api/_handler.ts
initServerSentry();
var app = (0, import_express17.default)();
var allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.VITE_APP_URL
].filter(Boolean);
app.use((0, import_cors.default)({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o)) || origin.endsWith(".vercel.app")) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  }
}));
app.use(import_express17.default.json());
app.use("/api/pdf", pdfRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/session", sessionRoutes);
app.use("/api/character", characterRoutes);
app.use("/api/oracle", oracleRoutes);
app.use("/api/npc", npcRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/image", imageRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/faction", factionRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/memory", memoryRoutes);
app.use("/api/tavern", tavernRoutes);
app.use("/api/loot", lootRoutes);
app.use("/api/rulebook", rulebookRoutes);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
Sentry.setupExpressErrorHandler(app);
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});
var handler_default = app;
