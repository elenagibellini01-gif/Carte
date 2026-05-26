import { useState, useEffect, useRef } from 'react'
import './App.css'
import Chart from 'chart.js/auto'


function App() {
const [partecipanti, setPartecipanti] = useState([])
const [exPartecipanti, setExPartecipanti] = useState([])
const [text, setText] = useState("")
const [fase, setFase] = useState("paginainiziale")
const [erroreSetup, setErroreSetup] = useState("")
const [count, setCount] = useState(0)
const [showInput, setShowInput] = useState(false)
const [numeroMazzi, setNumeroMazzi] = useState(1)
const [turno, setTurno] = useState(1)
const [faseTurno, setFaseTurno] = useState("predizione")
const [menuOpen, setMenuOpen] = useState(false)
const [partecipantiRegistrati, setPartecipantiRegistrati] = useState([])
const [nuovoPartecipante, setNuovoPartecipante] = useState("")
const [statsPartecipante, setStatsPartecipante] = useState(null)
const [statsPartite, setStatsPartite] = useState(null)
const [erroreModifica, setErroreModifica] = useState("")
const [storicoTurni, setStoricoTurni] = useState([])
const [partitaSelezionataId, setPartitaSelezionataId] = useState(null)
const chartCanvasRef = useRef(null)
const chartInstanceRef = useRef(null)

const costruisciDatiGrafico = (partita) => {
  if (!partita?.turni?.length) return null

  const labels = partita.turni.map((t) => `Turno ${t.turno}`)
  const nomiGiocatori = (partita.classificaFinale || []).map((g) => g.nome)
  const colori = ['blue', 'red', 'green', 'orange', 'purple', 'yellow', 'brown', ]

  const datasets = nomiGiocatori.map((nome, index) => ({
    label: nome,
    data: partita.turni.map((turnoCorrente) => {
      const punteggioGiocatore = (turnoCorrente.punteggi || []).find((p) => p.nome === nome)
      return punteggioGiocatore ? Number(punteggioGiocatore.punteggio || 0) : null
    }),
    borderColor: colori,
    backgroundColor: colori, 
    tension: 0.25,
    spanGaps: true
  }))

  return { labels, datasets }
} 
//https://www.chartjs.org/docs/latest/general/padding.html 

const caricaRecenti = async () => {
try {
	const response = await fetch("http://localhost:3000/partecipanti/recenti");
	const data = await response.json();
    console.log("Dati ricevuti da /partecipanti/recenti:", data);
	setExPartecipanti(data);
} catch (err) {
    console.error("Errore durante il fetch di ex partecipanti:", err);
	console.error(err);
}
};

useEffect(() => {
  caricaRecenti();
}, []); //chiama backend

useEffect(() => {
  if (fase === "setupmod") {
    caricaPartecipantiRegistrati()
  }
}, [fase])

useEffect(() => {
  if (fase === "statistiche") {
    caricaStatistichePartite()
  }
}, [fase])

useEffect(() => {
  if (fase !== "statistiche") return 
  if (!statsPartite?.partite?.length) return
  if (!chartCanvasRef.current) return //pagina ok, dati ok

  const partita = statsPartite.partite.find((p) => p.partitaId === partitaSelezionataId)
  if (!partita) return

  const datiGrafico = costruisciDatiGrafico(partita)
  if (!datiGrafico) return

  if (chartInstanceRef.current) {
    chartInstanceRef.current.destroy()
  }

  chartInstanceRef.current = new Chart(chartCanvasRef.current, {
    type: "line",
    data: datiGrafico,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  })

  return () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
      chartInstanceRef.current = null
    }
  }
}, [fase, statsPartite, partitaSelezionataId])

const caricaPartecipantiRegistrati = async () => {
  try {
    const response = await fetch("http://localhost:3000/partecipanti")
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || "Errore caricamento partecipanti")
    }

    setPartecipantiRegistrati(data)
    setErroreModifica("")
  } catch (err) {
    console.error(err)
    setErroreModifica("Errore caricamento partecipanti")
  }
}

const registraPartecipante = async () => {
  const nome = nuovoPartecipante.trim()

  if (!nome) return

  try {
    const response = await fetch("http://localhost:3000/partecipanti", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nome })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || "Errore registrazione partecipante")
    }

    setNuovoPartecipante("")
    await caricaPartecipantiRegistrati()
  } catch (err) {
    console.error(err)
	setErroreModifica("Errore registrazione partecipante")
  }
}

const eliminaPartecipanteRegistrato = async (id) => {
  try {
    const response = await fetch(`http://localhost:3000/partecipanti/${id}`, {
      method: "DELETE"
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data?.error || "Errore eliminazione partecipante")
    }

    if (statsPartecipante?.id === id) {
      setStatsPartecipante(null)
    }

    await caricaPartecipantiRegistrati()
  } catch (err) {
    console.error(err)
    setErroreModifica("Errore eliminazione partecipante")
  }
}

const rinominaPartecipante = async (id, nomeAttuale) => {
  let nuovoNome = window.prompt("Nuovo nome partecipante", nomeAttuale)

  if (nuovoNome === null) return

  const nome = nuovoNome.trim()
  if (!nome) return

  try {
    const response = await fetch(`http://localhost:3000/partecipanti/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nome })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || "Errore rinomina partecipante")
    }

    await caricaPartecipantiRegistrati()

    if (statsPartecipante?.id === id) {
      await caricaStatistichePartecipante(id)
    }
  } catch (err) {
    console.error(err)
    setErroreModifica("Errore rinomina partecipante")
  }
}

const caricaStatistichePartecipante = async (id) => {
  try {
    const response = await fetch(`http://localhost:3000/partecipanti/${id}/stats`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || "Errore caricamento statistiche")
    }

    setStatsPartecipante(data)
    setErroreModifica("")
  } catch (err) {
    console.error(err)
    setErroreModifica("Errore caricamento statistiche")
  }
}

const caricaStatistichePartite= async () => {
  try {
    const response = await fetch(`http://localhost:3000/partite/recenti`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data?.error || "Errore caricamento statistiche partite")
    }

    setStatsPartite(data)
    setPartitaSelezionataId(data?.partite?.[0]?.partitaId ?? null)
    setErroreModifica("")
  } catch (err) {
    console.error(err)
    setErroreModifica("Errore caricamento statistiche partite")
  }
}

  const aggiungiPartecipante = (nomeEx = "") => {
    const nomeDaAggiungere = (nomeEx || text).trim()

    if (!nomeDaAggiungere) return

    const nomeGiaPresente = partecipanti.some(
      p => p.nome.trim().toLowerCase() === nomeDaAggiungere.toLowerCase()
    )

    if (nomeGiaPresente) return

    setPartecipanti(prev => [
      
      {
        id: count,
        nome: nomeDaAggiungere,
        leader: false,
        punteggio: 0,
        predizione: 0,
        prese: 0
      },
	...prev,
    ])

    setCount(prev => prev + 1)
    setText("")
    setShowInput(false)
    setErroreSetup("")
  }

  const eliminaPartecipante = (id) => {
    setPartecipanti(prev =>
      prev.filter(p => p.id !== id)
    )
  }

  const avviaGioco = () => {
    if (partecipanti.length < 2) {
			const messaggio = "Aggiungi almeno 2 partecipanti per avviare il gioco!"
			console.log(messaggio)
			setErroreSetup(messaggio)
      return
    }

    if (!partecipanti.some(p => p.leader)) {
			const messaggio = "Dichiara un leader prima di avviare il gioco!"
			console.log(messaggio)
			setErroreSetup(messaggio)
      return
    }

		setErroreSetup("")
    
    const carteNecessarie = partecipanti.length * 7
    const mazzi = Math.ceil(carteNecessarie / 52) //	ritorna l'intero più piccolo 

    setNumeroMazzi(mazzi)

    setFase("play")
  }



  const dichiaraLeader = (id) => {
    setPartecipanti(prev =>
      prev.map(p => ({
        ...p,
        leader: p.id === id
      }))
    )
		setErroreSetup("")
  }

  
  const aggiornaGiocatore = (id, campo, valore) => {
    setPartecipanti(prev =>
      prev.map(p =>
        p.id === id
          ? {
              ...p,
              [campo]: Number(valore)
            }
          : p
      )
    )
  }

  
  const fineTurno = () => {
    setPartecipanti(prev =>
      {
      const aggiornati = prev.map(p => {
        let nuoviPunti = p.punteggio

        if (p.predizione === p.prese) {
          nuoviPunti += 10 + p.prese
        }

        return {
          ...p,
          punteggio: nuoviPunti


        }
      })

      setStoricoTurni(prevStorico => {
        const snapshotTurno = {
          turno,
          punteggi: aggiornati.map((p) => ({
            nome: p.nome,
            punteggio: p.punteggio
          }))
        }

        const senzaTurnoCorrente = prevStorico.filter((t) => t.turno !== turno)
        return [...senzaTurnoCorrente, snapshotTurno].sort((a, b) => a.turno - b.turno)
      })

      return aggiornati
      }
    )

    setFaseTurno("classifica")
  }

const finePartita = async() => {
	try {
		const response = await fetch("http://localhost:3000/partite", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
        partecipanti,
        andamentoTurni: storicoTurni
			})
		});

		if (!response.ok) {
			throw new Error("Errore salvataggio partita");
		}

		await caricaRecenti();
		console.log("Partita salvata");
	} catch (err) {
		console.error(err);
	}

	
	setPartecipanti([]);
  setStoricoTurni([])
	setTurno(1);
  setFaseTurno("predizione")
	setFase("setup");
};

  const prossimoTurno = () => {
    setTurno(prev => prev + 1)

    setPartecipanti(prev =>
      prev.map(p => ({
        ...p,
        predizione: 0,
        prese: 0
      }))
    )

    setFaseTurno("predizione")
  }

  const partitaSelezionata = statsPartite?.partite?.find((p) => p.partitaId === partitaSelezionataId) || null



  return (
	

    <div className="min-h-screen bg-gray-100">

	<div className="p-6">
		
		<button onClick={() => setMenuOpen(prev => !prev)} className="fixed left-6 top-6 bg-white hover:bg-gray-900 text-black p-3 rounded-lg shadow-lg z-50">
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		{menuOpen && (
			<div className="left-6 top-20 bg-white shadow-lg rounded-lg p-4 space-y-2 absolute z-40">
				<button onClick={() => { setFase("paginainiziale"); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Home</button>
				<button onClick={() => { setFase("setup"); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Nuova Partita</button>
				<button onClick={() => { setFase("setupmod"); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Modifica Partecipanti</button>
				<button onClick={() => { setFase("statistiche"); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100">Statistiche</button>
				
			</div>
		)}
		
		
	</div>

		{fase === "setupmod" && (
			<>
			<div className="p-6">
				<h1 className="text-3xl font-bold text-gray-800">
					Modifica Partecipanti
				</h1>

        <p className="text-gray-500 text-sm mt-2">
          Registra, elimina o rinomina i partecipanti. Clicca sul nome per vedere le statistiche.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            className="w-full border border-gray-300 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="text"
            placeholder="Nuovo partecipante..."
            value={nuovoPartecipante}
            onChange={(e) => setNuovoPartecipante(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") registraPartecipante()
            }}
          />

          <button
            onClick={registraPartecipante}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-xl shadow-lg"
          >
            Aggiungi
          </button>
        </div>

        {erroreModifica && (
          <p className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
            {erroreModifica}
          </p>
        )}

        <div className="mt-6 space-y-2">
          {partecipantiRegistrati.length === 0 ? (
            <p className="text-gray-400 text-sm">Nessun partecipante registrato</p>
          ) : (
            partecipantiRegistrati.map((p) => (
              <div
                key={p.id}
                className="bg-white shadow-sm rounded-xl p-3 text-gray-800 flex items-center justify-between"
              >
                <button
                  onClick={() => caricaStatistichePartecipante(p.id)}
                  className="font-medium hover:underline"
                >
                  {p.nome}
                </button>

                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => rinominaPartecipante(p.id, p.nome)}
                    className="text-sm text-blue-700 hover:underline"
                  >
                    Rinomina
                  </button>

                  <button
                    onClick={() => eliminaPartecipanteRegistrato(p.id)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {statsPartecipante && (
          <div className="mt-8 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800">Statistiche: {statsPartecipante.nome}</h2>
            <p className="text-gray-600 mt-2">Partite giocate: {statsPartecipante.partiteGiocate}</p>
            <p className="text-gray-600">Percentuale vittoria: {statsPartecipante.percentualeVittoria}%</p>
            <p className="text-gray-600">Percentuale ultimo posto: {statsPartecipante.percentualeUltimo}%</p>

            <div className="mt-4">
              <h3 className="font-semibold text-gray-700">Risultati passati</h3>
              {statsPartecipante.risultati.length === 0 ? (
                <p className="text-gray-400 text-sm mt-2">Nessun risultato disponibile</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {statsPartecipante.risultati.map((r) => (
                    <div key={r.partita_id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      Partita {r.partita_id} - Punteggio {r.punteggio} - Posizione {r.posizione}/{r.totale_giocatori}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

				
			</div>
				</>)}

    {fase === "statistiche" && (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800">Statistiche Partite</h1>
        <p className="text-gray-500 text-sm mt-2">
          Seleziona una partita per vedere l'andamento dei punteggi turno per turno.
        </p>

        {erroreModifica && (
          <p className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
            {erroreModifica}
          </p>
        )}

        {!statsPartite ? (
          <p className="text-gray-400 text-sm mt-4">Caricamento statistiche...</p>
        ) : (
          <>
            <p className="text-gray-600 mt-4">Partite trovate: {statsPartite.partiteGiocate}</p>

            {statsPartite.partiteGiocate === 0 ? (
              <p className="text-gray-400 text-sm mt-2">Nessuna partita disponibile</p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-[320px,1fr]">
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {statsPartite.partite.map((partita) => {
                    const vincitore = [...partita.classificaFinale].sort((a, b) => b.punteggio - a.punteggio)[0]
                    const attiva = partita.partitaId === partitaSelezionataId

                    return (
                      <button
                        key={partita.partitaId}
                        onClick={() => setPartitaSelezionataId(partita.partitaId)}
                        className={`w-full rounded-xl border px-4 py-3 text-left shadow-sm transition ${
                          attiva
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-semibold text-gray-800">Partita {partita.partitaId}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(partita.createdAt).toLocaleString("it-IT")}
                        </p>
                        {vincitore && (
                          <p className="text-sm text-gray-700 mt-2">
                            Vincitore: {vincitore.nome} ({vincitore.punteggio} pt)
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm">
                  {!partitaSelezionata ? (
                    <p className="text-gray-400 text-sm">Seleziona una partita dalla lista</p>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-gray-800">
                        Partita {partitaSelezionata.partitaId}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Turni registrati: {partitaSelezionata.turni.length}
                      </p>

                      <div className="mt-4 h-[320px]">
                        <canvas ref={chartCanvasRef}></canvas>
                      </div>

                      <div className="mt-4">
                        <h3 className="font-semibold text-gray-700">Classifica finale</h3>
                        <div className="mt-2 space-y-2">
                          {[...partitaSelezionata.classificaFinale]
                            .sort((a, b) => b.punteggio - a.punteggio)
                            .map((p, index) => (
                              <div
                                key={`${partitaSelezionata.partitaId}-${p.nome}`}
                                className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                              >
                                {index + 1}. {p.nome} - {p.punteggio} pt
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}

		{fase === "paginainiziale" && (
        <>
          <div className="p-6">
	        <h1 className="text-3xl font-bold text-gray-800">
              Benvenut*
            </h1> 

            <button
              onClick={() => setFase("setup")}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg mt-6">
              Nuova partita
            </button>

          
          </div>
        </>
      )}

      
      {fase === "setup" && (
        <>
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Lista Partecipanti
            </h1>

            <p className="text-gray-500 text-sm">
              Aggiungi i giocatori per iniziare
            </p>
          </div>

          {showInput && (
            <div className="px-6">
              <input
                className="w-full border border-gray-300 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                type="text"
                placeholder="Nome partecipante..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aggiungiPartecipante()
                }} //premendo invio, il contrario di onKeyPress
			
              />
            </div>
          )}

          <div className="px-6 mt-6 space-y-2">
            {partecipanti.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Nessun partecipante ancora
              </p>
            ) : (
              partecipanti.map((p) => (
                <div
                  key={p.id}
                  className="bg-white shadow-sm rounded-xl p-3 text-gray-800 flex items-center justify-between"
                >

                  <span>{p.nome}</span>

                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => dichiaraLeader(p.id)}
                      className="text-xl"
                    >
                      {p.leader ? "♦" : "♢"}
                    </button>

                    <button
                      onClick={() => eliminaPartecipante(p.id)}
                    >
                      🗑
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

          <div className="px-6 mt-6">
						{erroreSetup && (
							<p className="mb-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700">
								{erroreSetup}
							</p>
						)}

            <button
              onClick={avviaGioco}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg"
            >
              Continua
            </button>
          </div>

      <div className="px-6 mt-6">
        <h3 className="text-gray-700 font-semibold mb-2">ultimi ex partecipanti</h3>
        {exPartecipanti.length === 0 ? (
          <p className="text-gray-400 text-sm">Nessun ex partecipante disponibile</p>
        ) : (
          <div className="max-h-48 overflow-y-auto grid grid-cols-5 gap-2 pr-1">
            {exPartecipanti.map((p) => (
              <div key={p.nome}>
                <button
                  className="w-full h-12 text-black text-sm rounded-xl bg-white hover:bg-gray-100 shadow"
                  onClick={() => aggiungiPartecipante(p.nome)}
                >
                  {p.nome}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
		
			

          <button
            onClick={() => setShowInput(true)}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-4 rounded-full shadow-lg"
          >
            +
          </button>

          {showInput && (
            <button
              onClick={() => aggiungiPartecipante()}
              className="fixed bottom-24 right-6 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg"
            >
              OK
            </button>
          )}
        </>
      )}

      
      {fase === "play" && (
        <div className="p-6">

          <h2 className="text-2xl font-bold text-gray-800">
            Turno {turno}
          </h2>

          
          {faseTurno === "predizione" && (
            <div className="space-y-4">

              <h3 className="text-lg font-semibold">
                Quanto pensano di prendere?
              </h3>

              {partecipanti.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <p className="font-medium">
                    {p.nome}
                  </p>

                  <input
                    type="number"
                    value={p.predizione}
                    onChange={(e) =>
                      aggiornaGiocatore(
                        p.id,
                        "predizione",
                        e.target.value
                      )
                    }
                    className="w-full mt-2 border rounded-lg p-2"
                  />
                </div>
              ))}

              <button
                onClick={() => setFaseTurno("risultati")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
                Inizia Turno
              </button>

            </div>
          )}



          {faseTurno === "risultati" && (
            <div className="space-y-4">

              <h3 className="text-lg font-semibold">
                Quante ne hanno prese?
              </h3>

              {partecipanti.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <p className="font-medium">
                    {p.nome}
                  </p>

                  <input
                    type="number"
                    value={p.prese}
                    onChange={(e) =>
                      aggiornaGiocatore(
                        p.id,
                        "prese",
                        e.target.value
                      )
                    }
                    className="w-full mt-2 border rounded-lg p-2"
                  />
                </div>
              ))}

              <button
                onClick={fineTurno}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
              >
                Fine Turno 
              </button>

            </div>
          )}

          {faseTurno === "classifica" && (
            <div className="space-y-4">

              <h3 className="text-2xl font-bold">
                Classifica
              </h3>

              {[...partecipanti]
                .sort((a, b) => b.punteggio - a.punteggio)
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <p className="font-semibold text-lg">
                      {p.nome}
                    </p>

                    <p className="text-gray-600">
                      Punti: {p.punteggio}
                    </p>
                  </div>
                ))}

              <button
                onClick={prossimoTurno}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl">
                Prossimo Turno
              </button>

              <button
                onClick={finePartita}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl"
              >
                Fine Partita
              </button>

            </div>
          )}

        </div>
      )}

    </div>
  )
}

export default App