import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
const { Pool } = pg;
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { MOCK_SUBJECTS, MOCK_LESSONS, MOCK_QUESTIONS } from "./src/mockData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudflare R2 Client - Lazy initialization to prevent startup crashes if keys are missing
let r2Client: S3Client | null = null;
const getR2Client = () => {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || "https://b94b59f6ac6870ef08ad4ea5384fc042.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return r2Client;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:NCfVhcZm10XF3VJBu0Jr5ZgpHO7Inx5j4CMozbXrKPtsY2Mp51rMEbROOoSsKC84@187.77.230.251:5432/postgres",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

async function syncDatabase() {
  try {
    console.log("Tentando conectar ao Postgres em 187.77.230.251:5432...");
    const client = await pool.connect();
    console.log("Conexão estabelecida com sucesso!");
    client.release();
    
    // Criar Tabelas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        total_lessons INTEGER DEFAULT 0,
        completed_lessons INTEGER DEFAULT 0,
        level TEXT,
        map_url TEXT,
        audio_url TEXT,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        subject_id TEXT REFERENCES subjects(id),
        title TEXT NOT NULL,
        content TEXT,
        map_url TEXT,
        audio_url TEXT
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        subject_id TEXT REFERENCES subjects(id),
        lesson_id TEXT REFERENCES lessons(id),
        text TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INTEGER NOT NULL,
        explanation TEXT,
        level TEXT
      );
    `);

    // Migrações manuais para colunas novas caso as tabelas já existam
    console.log("Verificando/Adicionando colunas de mídia...");
    const migrationQueries = [
      "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS map_url TEXT",
      "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS audio_url TEXT",
      "ALTER TABLE subjects ADD COLUMN IF NOT EXISTS image_url TEXT",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS map_url TEXT",
      "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS audio_url TEXT"
    ];

    for (const q of migrationQueries) {
      try {
        await pool.query(q);
        console.log(`Sucesso: ${q}`);
      } catch (e) {
        console.warn(`Aviso na migração (${q}):`, (e as Error).message);
      }
    }

    // Inserir/Atualizar dados
    console.log("Sincronizando dados (UPSERT)...");
    
    for (const s of MOCK_SUBJECTS) {
      await pool.query(
        `INSERT INTO subjects (id, name, icon, color, total_lessons, completed_lessons, level, map_url, audio_url, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name, 
            icon = EXCLUDED.icon, 
            color = EXCLUDED.color, 
            total_lessons = EXCLUDED.total_lessons, 
            level = EXCLUDED.level,
            map_url = COALESCE(subjects.map_url, EXCLUDED.map_url),
            audio_url = COALESCE(subjects.audio_url, EXCLUDED.audio_url),
            image_url = COALESCE(subjects.image_url, EXCLUDED.image_url)`,
        [s.id, s.name, s.icon, s.color, s.totalLessons, s.completedLessons, s.level, (s as any).mapUrl || null, (s as any).audioUrl || null, (s as any).imageUrl || null]
      );
    }

    for (const l of MOCK_LESSONS) {
      await pool.query(
        `INSERT INTO lessons (id, subject_id, title, content, map_url, audio_url) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (id) DO UPDATE SET 
            subject_id = EXCLUDED.subject_id, 
            title = EXCLUDED.title, 
            content = EXCLUDED.content,
            map_url = COALESCE(lessons.map_url, EXCLUDED.map_url),
            audio_url = COALESCE(lessons.audio_url, EXCLUDED.audio_url)`,
        [l.id, l.subjectId, l.title, l.content, (l as any).mapUrl || null, (l as any).audioUrl || null]
      );
    }

    for (const q of MOCK_QUESTIONS) {
      await pool.query(
        `INSERT INTO questions (id, subject_id, lesson_id, text, options, correct_index, explanation, level) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         ON CONFLICT (id) DO UPDATE SET 
            subject_id = EXCLUDED.subject_id, 
            lesson_id = EXCLUDED.lesson_id, 
            text = EXCLUDED.text, 
            options = EXCLUDED.options, 
            correct_index = EXCLUDED.correct_index, 
            explanation = EXCLUDED.explanation, 
            level = EXCLUDED.level`,
        [q.id, q.subjectId, q.lessonId, q.text, JSON.stringify(q.options), q.correctIndex, q.explanation, q.level]
      );
    }

    console.log("Sincronização concluída com sucesso!");
  } catch (err) {
    console.error("Erro ao sincronizar banco de dados:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Sincronizar ao iniciar
  await syncDatabase();

  // Rotas de API
  app.get("/api/db-status", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT NOW()");
      res.json({ connected: true, serverTime: rows[0].now });
    } catch (err) {
      res.status(500).json({ connected: false, error: (err as Error).message });
    }
  });

  app.get("/api/r2-check", async (req, res) => {
    try {
      const bucketName = process.env.R2_BUCKET_NAME || "foconaprova";
      res.json({ 
        success: true, 
        message: "R2 client configuration verified",
        config: {
          endpoint: process.env.R2_ENDPOINT ? "Configured" : "Missing (using default)",
          bucket: bucketName,
          publicUrl: !!process.env.R2_PUBLIC_URL
        }
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/upload", async (req, res) => {
    const { data, filename, type } = req.body;
    if (!data || !filename) {
      return res.status(400).json({ error: "Missing data or filename" });
    }

    try {
      const client = getR2Client();
      // Decode base64
      let buffer: Buffer;
      if (data.startsWith("data:")) {
        const base64Data = data.split(",")[1];
        buffer = Buffer.from(base64Data, "base64");
      } else {
        buffer = Buffer.from(data, "base64");
      }

      const bucketName = process.env.R2_BUCKET_NAME || "foconaprova";
      const publicUrl = process.env.R2_PUBLIC_URL || "https://pub-0b4fef193b204b799a2d3f0cc36a2e67.r2.dev";

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: buffer,
        ContentType: type || "application/octet-stream",
      });

      await client.send(command);

      const url = `${publicUrl}/${filename}`;
      res.json({ success: true, url });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/subjects", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT id, name, icon, color, total_lessons as \"totalLessons\", completed_lessons as \"completedLessons\", level, map_url as \"mapUrl\", audio_url as \"audioUrl\", image_url as \"imageUrl\" FROM subjects");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.json(MOCK_SUBJECTS); // Fallback
    }
  });

  app.get("/api/lessons", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT id, subject_id as \"subjectId\", title, content, map_url as \"mapUrl\", audio_url as \"audioUrl\" FROM lessons");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.json(MOCK_LESSONS);
    }
  });

  // Admin Routes - Subjects
  app.post("/api/subjects", async (req, res) => {
    const { id, name, icon, color, level, mapUrl, audioUrl, imageUrl } = req.body;
    try {
      const { rows } = await pool.query(
        "INSERT INTO subjects (id, name, icon, color, level, map_url, audio_url, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, icon, color, total_lessons as \"totalLessons\", completed_lessons as \"completedLessons\", level, map_url as \"mapUrl\", audio_url as \"audioUrl\", image_url as \"imageUrl\"",
        [id, name, icon || 'BookOpen', color || 'bg-slate-500', level, mapUrl, audioUrl, imageUrl]
      );
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.put("/api/subjects/:id", async (req, res) => {
    const { name, icon, color, level, mapUrl, audioUrl, imageUrl } = req.body;
    console.log(`PUT /api/subjects/${req.params.id}`, req.body);
    try {
      const result = await pool.query(
        "UPDATE subjects SET name = $1, icon = $2, color = $3, level = $4, map_url = $5, audio_url = $6, image_url = $7 WHERE id = $8",
        [name, icon, color, level, mapUrl, audioUrl, imageUrl, req.params.id]
      );
      res.json({ success: true, updated: result.rowCount });
    } catch (err) { 
      console.error("Subject update error:", err);
      res.status(500).json({ error: (err as Error).message }); 
    }
  });

  app.delete("/api/subjects/:id", async (req, res) => {
    console.log(`DELETE /api/subjects/${req.params.id}`);
    try {
      await pool.query("DELETE FROM questions WHERE subject_id = $1", [req.params.id]);
      await pool.query("DELETE FROM lessons WHERE subject_id = $1", [req.params.id]);
      const result = await pool.query("DELETE FROM subjects WHERE id = $1", [req.params.id]);
      res.json({ success: true, deleted: result.rowCount });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Admin Routes - Lessons
  app.post("/api/lessons", async (req, res) => {
    const { id, subjectId, title, content, mapUrl, audioUrl } = req.body;
    console.log("POST /api/lessons", req.body);
    try {
      const { rows } = await pool.query(
        "INSERT INTO lessons (id, subject_id, title, content, map_url, audio_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, subject_id as \"subjectId\", title, content, map_url as \"mapUrl\", audio_url as \"audioUrl\"",
        [id, subjectId, title, content, mapUrl, audioUrl]
      );
      // Update subject total count
      await pool.query("UPDATE subjects SET total_lessons = (SELECT count(*) FROM lessons WHERE subject_id = $1) WHERE id = $1", [subjectId]);
      res.json(rows[0]);
    } catch (err) { 
      console.error("Lesson create error:", err);
      res.status(500).json({ error: (err as Error).message }); 
    }
  });

  app.put("/api/lessons/:id", async (req, res) => {
    const { subjectId, title, content, mapUrl, audioUrl } = req.body;
    const lessonId = req.params.id;
    console.log(`PUT /api/lessons/${lessonId}`, { 
      subjectId, 
      title, 
      contentLength: content?.length, 
      mapUrl, 
      audioUrl 
    });
    
    try {
      const result = await pool.query(
        "UPDATE lessons SET subject_id = $1, title = $2, content = $3, map_url = $4, audio_url = $5 WHERE id = $6",
        [subjectId, title, content, mapUrl, audioUrl, lessonId]
      );
      
      console.log(`Update result for ${lessonId}:`, result.rowCount);
      
      if (result.rowCount === 0) {
        console.warn(`No lesson found with id ${lessonId} to update.`);
      }

      res.json({ success: true, updated: result.rowCount });
    } catch (err) { 
      console.error("Lesson update error details:", err);
      res.status(500).json({ error: (err as Error).message }); 
    }
  });

  app.delete("/api/lessons/:id", async (req, res) => {
    try {
      const { rows } = await pool.query("DELETE FROM lessons WHERE id = $1 RETURNING subject_id", [req.params.id]);
      if (rows[0]) {
        await pool.query("UPDATE subjects SET total_lessons = (SELECT count(*) FROM lessons WHERE subject_id = $1) WHERE id = $1", [rows[0].subject_id]);
      }
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.get("/api/questions", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT id, subject_id as \"subjectId\", lesson_id as \"lessonId\", text, options, correct_index as \"correctIndex\", explanation, level FROM questions");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.json(MOCK_QUESTIONS);
    }
  });

  app.post("/api/questions", async (req, res) => {
    const { id, subjectId, lessonId, text, options, correctIndex, explanation, level } = req.body;
    try {
      const { rows } = await pool.query(
        "INSERT INTO questions (id, subject_id, lesson_id, text, options, correct_index, explanation, level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, subject_id as \"subjectId\", lesson_id as \"lessonId\", text, options, correct_index as \"correctIndex\", explanation, level",
        [id, subjectId, lessonId, text, JSON.stringify(options), correctIndex, explanation, level]
      );
      res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  app.put("/api/questions/:id", async (req, res) => {
    const { subjectId, lessonId, text, options, correctIndex, explanation, level } = req.body;
    console.log(`PUT /api/questions/${req.params.id}`, req.body);
    try {
      await pool.query(
        "UPDATE questions SET subject_id = $1, lesson_id = $2, text = $3, options = $4, correct_index = $5, explanation = $6, level = $7 WHERE id = $8",
        [subjectId, lessonId, text, JSON.stringify(options), correctIndex, explanation, level, req.params.id]
      );
      res.json({ success: true });
    } catch (err) { 
      console.error("Question update error:", err);
      res.status(500).json({ error: (err as Error).message }); 
    }
  });

  app.delete("/api/questions/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM questions WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: (err as Error).message }); }
  });

  // Configuração do Vite middleware ou arquivos estáticos
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log("Banco de dados Postgres (Coolify) integrado.");
  });
}

startServer();
