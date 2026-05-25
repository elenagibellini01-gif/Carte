const express = require("express");
const {Client}= require("pg")

const app = express();
const PORT = process.env.PORT || 3000;

const client = new Client({
	host: "localhost",
	port: 5432,
	user: "admin",
	password: "password",
	database: "appdb",
}); //connessione al db

app.use(express.json());

app.get("/", (req, res) => {
	res.json({
		message: "Express backend is running",
		timestamp: new Date().toISOString(),
	});
});

app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

app.post("/echo", (req, res) => {
	console.log(req.body);
	res.status(200).json({ received: req.body });
});

app.post("/partite", async (req, res) => {
	try {
		const { partecipanti } = req.body;


		const partitaResult = await client.query(
			"INSERT INTO partite DEFAULT VALUES RETURNING id" //crea partita e ritorna id
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

client.connect()
	.then(() => console.log("Connected to PostgreSQL"))
	.catch(err => console.error(err)) 

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Backend listening on http://localhost:${PORT}`);
});
