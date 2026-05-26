const express = require("express");
const {Client}= require("pg")

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
	host: "db", //quello del docker-compose
	port: 5432,
	user: "admin",
	password: "password",
	database: "appdb",
}); //configura connessione al db->

client.connect()
	.then(() => console.log("Connected to PostgreSQL"))
	.catch(err => console.error(err)) //connessione db

const inizializzaSchema = async () => {
	try {
		await client.query(`
			CREATE TABLE IF NOT EXISTS partite (
				id SERIAL PRIMARY KEY,
				created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				andamento_turni JSONB
			)
		`)

		await client.query(`
			CREATE TABLE IF NOT EXISTS giocatori_partita (
				id SERIAL PRIMARY KEY,
				partita_id INT NOT NULL REFERENCES partite(id) ON DELETE CASCADE,
				nome TEXT NOT NULL,
				punteggio INT NOT NULL DEFAULT 0
			)
		`)

		await client.query(`
			ALTER TABLE partite
			ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		`)

		await client.query(`
			ALTER TABLE partite
			ADD COLUMN IF NOT EXISTS andamento_turni JSONB
		`)

		await client.query(`
			CREATE TABLE IF NOT EXISTS partecipanti (
				id SERIAL PRIMARY KEY,
				nome TEXT UNIQUE NOT NULL
			)
		`)

		await client.query(`
			INSERT INTO partecipanti (nome)
			SELECT DISTINCT nome
			FROM giocatori_partita
			ON CONFLICT (nome) DO NOTHING
		`)
	} catch (err) {
		console.error("Errore inizializzazione schema", err)
	}
}

inizializzaSchema() //crea tab

app.use(express.json()); //express legge json (HTTP)
//middleware per abilitare CORS
//backend e frontend comunicano, anche su pporte differenti
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}
	next();
});

/*app.get("/", (req, res) => {
	res.json({
		message: "Express backend is running",
		timestamp: new Date().toISOString(),
	});
});*/
/*
app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});*/
/*
app.post("/echo", (req, res) => {
	console.log(req.body);
	res.status(200).json({ received: req.body });
});*/

app.post("/partite", async (req, res) => {
	try {
		const { partecipanti, andamentoTurni } = req.body; 

		const andamentoTurniJson = Array.isArray(andamentoTurni)
			? JSON.stringify(andamentoTurni) //se è un array lo trasforma in stringa json
			: null

		const partitaResult = await client.query(
			`INSERT INTO partite 
			(andamento_turni) 
			VALUES ($1::jsonb) RETURNING id`,
			[andamentoTurniJson]
		);

		const partitaId = partitaResult.rows[0].id; //inserisce riga per la partita creata
		for (const p of partecipanti) {
				//senza await 
				await client.query(
					`INSERT INTO giocatori_partita
					(partita_id, nome, punteggio)
					VALUES ($1, $2, $3)`,
					[partitaId, p.nome, p.punteggio]
				);

				await client.query(
					`INSERT INTO partecipanti (nome)
					VALUES ($1)
					ON CONFLICT (nome) DO NOTHING`,
					[p.nome]
				);
			
		}

		res.status(201).json({
			message: "Partita salvata",
			partitaId
		}); //201 crreated

	} catch (err) {
		console.error(err);
		res.status(500).json({
			error: "Errore salvataggio partita"
		});
	}
});

app.get("/partite/recenti", async (req, res) => {
	try { //da db a frontend
		const result = await client.query(
			//2=data
			`SELECT
				p.id AS partita_id,
				p.created_at,
				p.andamento_turni,
				gp.nome,
				gp.punteggio
			FROM partite p
			LEFT JOIN giocatori_partita gp ON gp.partita_id = p.id 
			ORDER BY p.id DESC, gp.punteggio DESC, gp.nome ASC
			LIMIT 50` //left join prende tutte le partite anche senza giocatori, quindi  tabella di "sinistra". inner join/join prende quelle in entrambi
		)

		const mapPartite = new Map()

		for (const row of result.rows) {
			if (!mapPartite.has(row.partita_id)) {
				mapPartite.set(row.partita_id, {
					partitaId: Number(row.partita_id),
					createdAt: row.created_at,
					classificaFinale: [],
					turni: Array.isArray(row.andamento_turni) ? row.andamento_turni : []
				})
			}

			if (row.nome) {
				mapPartite.get(row.partita_id).classificaFinale.push({
					nome: row.nome,
					punteggio: Number(row.punteggio || 0)
				})
			}
		}

		const partite = [...mapPartite.values()]
			//.sort((a, b) => b.partitaId - a.partitaId)
			.slice(0, 30)
			.map((partita) => {
				const turni = partita.turni.length > 0
					? partita.turni
					: [{
						turno: 1,
						punteggi: partita.classificaFinale
					}]

				return {
					...partita,
					turni
				}
			})

		res.status(200).json({
			partiteGiocate: partite.length,
			partite
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Errore lettura statistiche partite" })
	}
})

app.get("/partecipanti/recenti", async (req, res) => {
  try {
    const result = await client.query(
      `
      SELECT nome
      FROM giocatori_partita
      GROUP BY nome
      ORDER BY MAX(partita_id) DESC
      LIMIT 10 
      ` //ultimi 10
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore lettura partecipanti recenti" });
  }
});

app.get("/partecipanti", async (req, res) => {
	try {
		const result = await client.query(
			`SELECT id, nome
			 FROM partecipanti
			 ORDER BY nome ASC` //ordine alfabetico
		)

		res.status(200).json(result.rows)
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Errore lettura partecipanti" })
	}
})

app.post("/partecipanti", async (req, res) => {
	try {
		const nome = (req.body?.nome || "").trim()

		if (!nome) {
			return res.status(400).json({ error: "Nome obbligatorio" })
		}

		const result = await client.query(
			`INSERT INTO partecipanti (nome)
			 VALUES ($1)
			 ON CONFLICT (nome) DO NOTHING
			 RETURNING id, nome`,
			[nome]
		)

		if (result.rows.length > 0) {
			return res.status(201).json(result.rows[0])
		}

		const existing = await client.query(
			`SELECT id, nome
			 FROM partecipanti
			 WHERE nome = $1`,
			[nome]
		)

		return res.status(200).json(existing.rows[0])
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Errore creazione partecipante" })
	}
})

app.patch("/partecipanti/:id", async (req, res) => {
	const id = Number(req.params.id)
	const nuovoNome = (req.body?.nome || "").trim()

	if (!id || !nuovoNome) {
		return res.status(400).json({ error: "Dati non validi" })
	}

	try {
		await client.query("BEGIN")

		const current = await client.query(
			`SELECT id, nome
			 FROM partecipanti
			 WHERE id = $1
			 FOR UPDATE`,
			[id]
		)

		if (current.rows.length === 0) {
			await client.query("ROLLBACK")
			return res.status(404).json({ error: "Partecipante non trovato" })
		}

		const vecchioNome = current.rows[0].nome

		const updated = await client.query(
			`UPDATE partecipanti
			 SET nome = $1
			 WHERE id = $2
			 RETURNING id, nome`,
			[nuovoNome, id]
		)

		await client.query(
			`UPDATE giocatori_partita
			 SET nome = $1
			 WHERE nome = $2`,
			[nuovoNome, vecchioNome]
		)

		await client.query("COMMIT")
		return res.status(200).json(updated.rows[0])
	} catch (err) {
		await client.query("ROLLBACK")
		if (err.code === "23505") {
			return res.status(409).json({ error: "Nome gia presente" })
		}
		console.error(err)
		res.status(500).json({ error: "Errore rinomina partecipante" })
	}
})

app.delete("/partecipanti/:id", async (req, res) => {
	const id = Number(req.params.id)

	if (!id) {
		return res.status(400).json({ error: "Id non valido" })
	}

	try {
		const result = await client.query(
			`DELETE FROM partecipanti
			 WHERE id = $1
			 RETURNING id, nome`,
			[id]
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Partecipante non trovato" })
		}

		res.status(200).json(result.rows[0])
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Errore eliminazione partecipante" })
	}
})

app.get("/partecipanti/:id/stats", async (req, res) => {
	const id = Number(req.params.id)

	if (!id) {
		return res.status(400).json({ error: "Id non valido" })
	}

	try {
		const partecipante = await client.query(
			`SELECT id, nome
			 FROM partecipanti
			 WHERE id = $1`,
			[id]
		)

		if (partecipante.rows.length === 0) {
			return res.status(404).json({ error: "Partecipante non trovato" })
		}

		const nome = partecipante.rows[0].nome

		const partiteGiocatoreResult = await client.query(
			`SELECT partita_id, punteggio
			 FROM giocatori_partita
			 WHERE nome = $1
			 ORDER BY partita_id DESC`,
			[nome]
		)

		const risultati = []
		let vittorie = 0
		let ultimi = 0

		for (const partita of partiteGiocatoreResult.rows) {
			const confrontoResult = await client.query(
				`SELECT
					MAX(punteggio)::int AS max_punteggio,
					MIN(punteggio)::int AS min_punteggio,
					COUNT(*)::int AS totale_giocatori,
					COALESCE(SUM(CASE WHEN punteggio > $2 THEN 1 ELSE 0 END), 0)::int AS sopra
				 FROM giocatori_partita
				 WHERE partita_id = $1`,
				[partita.partita_id, partita.punteggio]
			) //coalesce valuta gli argomenti in ordine e restituisce il primo valore non null che incontra nell'elenco. per evitare null.

			const confronto = confrontoResult.rows[0] || {
				max_punteggio: 0,
				min_punteggio: 0,
				totale_giocatori: 0,
				sopra: 0
			}

			const punteggio = Number(partita.punteggio || 0)
			const posizione = 1 + Number(confronto.sopra || 0)

			if (punteggio === Number(confronto.max_punteggio || 0)) {
				vittorie += 1
			}

			if (punteggio === Number(confronto.min_punteggio || 0)) {
				ultimi += 1
			}

			risultati.push({
				partita_id: Number(partita.partita_id),
				punteggio,
				posizione,
				totale_giocatori: Number(confronto.totale_giocatori || 0)
			})
		}

		const partiteGiocate = partiteGiocatoreResult.rows.length

		res.status(200).json({
			id,
			nome,
			partiteGiocate,
			vittorie,
			ultimi,
			percentualeVittoria: partiteGiocate > 0 ? Number(((vittorie / partiteGiocate) * 100).toFixed(1)) : 0,
			percentualeUltimo: partiteGiocate > 0 ? Number(((ultimi / partiteGiocate) * 100).toFixed(1)) : 0,
			risultati
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({ error: "Errore lettura statistiche partecipante" })
	}
})




app.listen(PORT, "0.0.0.0", () => {
	console.log(`Backend listening on http://localhost:${PORT}`);
});
