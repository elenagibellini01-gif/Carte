const express = require("express");
const {Client}= require("pg")

const app = express();
const PORT = process.env.PORT || 3001;

const client = new Client({
    host: "db-commenti", //quello del docker-compose
    port: 5432,
    user: "admin",
    password: "password",
    database: "postgres",
}); //configura connessione al db->

client.connect()
    .then(() => console.log("Connected to PostgreSQL"))
    .catch(err => console.error(err)) //connessione db

app.use(express.json());
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type");
	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}
	next();
});

/*type Commento = {
    id_partita: number;
    nome: string;
    commento: string;
}
const array_commenti: Commento[] = [];*/ //array in memoria, da sostituire con db




app.get("/read-comment/:id_partita", async (req, res) => {
    try{
        const idpartita = req.params.id_partita;
        const result= await client.query(
                                         `SELECT *
                                          FROM commenti
                                          WHERE id_partita=$1, [idpartita]`
                                         )
        
        
        res.status(200).json(result.rows)
    }
    
    catch (err) {
        console.error(err)
        res.status(500).json({ error: "Errore lettura partecipanti" })
    }
    /*const idpartita = req.params.id_partita;//id arriva come stringa
     res.status(200).json({
        id_partita: idpartita,
        commenti: array_commenti.filter(commento => commento.id_partita === parseInt(idpartita)) //filtro i commenti per id partita,
    })//select from*/
});

app.post("/add-comment", async (req, res) => {
    
    try{
        const {id_partita, nome, commento} = req.body;
        const result = await client.query(
                                         `INSERT INTO commenti (id_partita, nome, commento)
                                          VALUES ($1, $2, $3)`,
                                          [id_partita, nome, commento]
                                        
                                         )
        res.status(200).json({message: "Commento aggiunto con successo"})
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Errore aggiunta commento" })
    }
    /*array_commenti.push({id_partita, nome, commento}); ==>insert
    res.status(200).json({message: "Commento aggiunto con successo"});*/
});

app.listen(PORT, () => {
  console.log(`Social backend avviato sulla porta ${PORT}`);
});

