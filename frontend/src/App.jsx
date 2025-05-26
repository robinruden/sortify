import { useState } from 'react'

import './App.css'

function App() {
   const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setResult(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      setLoading(true)
      const res = await fetch('http://localhost:5000/analysera', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Något gick fel vid uppladdning')

      const data = await res.json()
      setResult(data)
    } catch (err) {
      console.error(err)
      setError('Kunde inte analysera ljudfilen.')
    } finally {
      setLoading(false)
    }
  }

  return (
  <div style={{ maxWidth: 600, margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h1>Sortify 🎧</h1>

      <input type="file" accept=".wav" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!file || loading}>
        {loading ? 'Analyserar...' : 'Analysera'}
      </button>

      {result && (
        <div style={{ marginTop: '2rem' }}>
          <p><strong>Tempo:</strong> {result.tempo} BPM</p>
          <p><strong>Tonart:</strong> {result.tonart}</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}

export default App
