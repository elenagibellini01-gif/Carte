import { useState } from 'react'
import './App.css'

function App() {
  const [partecipanti, setPartecipanti] = useState([])
  const [text, setText] = useState("")
  const [fase, setFase] = useState("setup")
  const [count, setCount] = useState(0)
  const [showInput, setShowInput] = useState(false)


  const aggiungiPartecipante = () => {
    if (!text.trim()) return

    setPartecipanti(prev => [
      ...prev,
      { id: count, nome: text, leader: false, punteggio: 0, predezione:0 }
    ])

    setCount(prev => prev + 1)
    setText("")
    setShowInput(false)
  }
  const eliminaPartecipante = (id) => {
    setPartecipanti(prev =>
      prev.filter(p => p.id !== id)
  )
}

const avviaGioco = () => {
  if (partecipanti.length < 2) {
    {console.log("Aggiungi almeno 2 partecipanti per avviare il gioco!")}
    return
  }
  if (!partecipanti.some(p => p.leader)) {
    {console.log("Dichiara un leader prima di avviare il gioco!")}
    return
  }
  setFase("play")
}

const dichiaraLeader = (id) => {
  setPartecipanti(prev =>
    prev.map(p => ({
      ...p,
      leader: p.id === id
    }))
  )
}

  return (
    <div className="min-h-screen bg-gray-100">

      
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
              className="bg-white shadow-sm rounded-xl p-3 text-gray-800"
            >
              
              <span>{p.nome}</span>

              <button
                onClick={() => dichiaraLeader(p.id)}
                className="text-xl"
              >
                {p.leader ? "♦" : "♢"}
              </button>
              <button
                onClick={() => eliminaPartecipante(p.id)}
                className="text-right "
              >
                🗑
              </button>
            </div>
          ))
        )}
        
      </div>

      <div className="px-6 mt-6">
        <button
          onClick={avviaGioco}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-lg"
        >
          Avvia Gioco
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

    </div>
  )
}

export default App