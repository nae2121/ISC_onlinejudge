// frontend/src/App.tsx
import React, { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState<string>('loading...');
  const [echo, setEcho] = useState<string>('');

  // マウント時に Flask の /api/hello を叩く
  useEffect(() => {
    fetch('http://localhost:5000/api/hello')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => {
        console.error(err);
        setMessage('error');
      });
  }, []);

  const handleEcho = async () => {
    const res = await fetch('http://localhost:5000/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'こんにちは Flask' }),
    });
    const data = await res.json();
    setEcho(JSON.stringify(data, null, 2));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Flask + React</h1>
      <p>GET /api/hello → {message}</p>

      <button onClick={handleEcho}>POST /api/echo を叩く</button>

      {echo && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: '#111',
            color: '#0f0',
          }}
        >
          {echo}
        </pre>
      )}
    </div>
  );
}

export default App;
