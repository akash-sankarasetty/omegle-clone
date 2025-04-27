import { useEffect, useRef, useState } from 'react';

function App() {
  const ws = useRef(null);
  const pc = useRef(null);
  const localVideo = useRef();
  const remoteVideo = useRef();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8080');

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: 'ready' }));
    };

    ws.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'match') {
        await startPeer(true);
      } else if (data.type === 'offer') {
        await startPeer(false, data.offer);
      } else if (data.type === 'answer') {
        await pc.current.setRemoteDescription(data.answer);
      } else if (data.type === 'candidate') {
        await pc.current.addIceCandidate(data.candidate);
      } else if (data.type === 'text') {
        setMessages((prev) => [...prev, `Stranger: ${data.text}`]);
      } else if (data.type === 'info') {
        setMessages((prev) => [...prev, `🛈 ${data.message}`]);
      }
    };

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideo.current.srcObject = stream;
      });

    return () => {
      ws.current.close();
    };
  }, []);

  const startPeer = async (initiator = true, remoteOffer = null) => {
    pc.current = new RTCPeerConnection();

    pc.current.onicecandidate = (e) => {
      if (e.candidate) {
        ws.current.send(JSON.stringify({ type: 'candidate', candidate: e.candidate }));
      }
    };

    pc.current.ontrack = (e) => {
      remoteVideo.current.srcObject = e.streams[0];
    };

    const stream = localVideo.current.srcObject;
    stream.getTracks().forEach(track => pc.current.addTrack(track, stream));

    if (initiator) {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      ws.current.send(JSON.stringify({ type: 'offer', offer }));
    } else {
      await pc.current.setRemoteDescription(remoteOffer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      ws.current.send(JSON.stringify({ type: 'answer', answer }));
    }
  };

  const sendMessage = () => {
    if (input.trim() !== '') {
      ws.current.send(JSON.stringify({ type: 'text', text: input }));
      setMessages((prev) => [...prev, `You: ${input}`]);
      setInput('');
    }
  };

  const nextStranger = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setMessages([]);
    ws.current.send(JSON.stringify({ type: 'ready' }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1>kartha</h1>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <video ref={localVideo} autoPlay muted style={{ width: '300px', height: '200px', background: '#000' }} />
        <video ref={remoteVideo} autoPlay style={{ width: '300px', height: '200px', background: '#000' }} />
      </div>

      <div style={{ width: '400px', height: '200px', overflowY: 'auto', border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
        {messages.map((msg, idx) => <div key={idx}>{msg}</div>)}
      </div>

      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{ padding: '10px', width: '300px', marginRight: '10px' }}
        />
        <button onClick={sendMessage} style={{ padding: '10px' }}>Send</button>
      </div>

      <button onClick={nextStranger} style={{ marginTop: '20px', padding: '10px', backgroundColor: 'orange' }}>Next Stranger</button>
    </div>
  );
}

export default App;
