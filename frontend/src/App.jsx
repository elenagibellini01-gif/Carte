import { useState } from 'react'
import './App.css'

function App() {
  const [partecipanti, setPartecipanti] = useState([])
  const [text, setText] = useState("")
  const [fase, setFase] = useState("setup")
	const [erroreSetup, setErroreSetup] = useState("")
  const [count, setCount] = useState(0)
  const [showInput, setShowInput] = useState(false)
  const [numeroMazzi, setNumeroMazzi] = useState(1)
  const [turno, setTurno] = useState(1)
  const [faseTurno, setFaseTurno] = useState("predizione")



  const aggiungiPartecipante = () => {
    if (!text.trim()) return

    setPartecipanti(prev => [
      ...prev,
      {
        id: count,
        nome: text,
        leader: false,
        punteggio: 0,
        predizione: 0,
        prese: 0
      }
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
      prev.map(p => {
        let nuoviPunti = p.punteggio

        if (p.predizione === p.prese) {
          nuoviPunti += 10 + p.prese
        }

        return {
          ...p,
          punteggio: nuoviPunti


        }
      })
    )

    setFaseTurno("classifica")
  }

const finePartita = async() => {
	try {
	await fetch("http://localhost:3000/partite", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			partecipanti
		})
	})
	

	console.log("Partita salvata")
} catch (err) {
	console.error(err)
	
}
	setFase("setup")

}


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

  return (
	

    <div className="min-h-screen bg-gray-100">

      
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
                }}
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

          <button
            onClick={() => setShowInput(true)}
            className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-4 rounded-full shadow-lg"
          >
            +
          </button>

          {showInput && (
            <button
              onClick={aggiungiPartecipante}
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl"
              >
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