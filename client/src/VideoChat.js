// client/src/VideoChat.js
import React, { useRef, useEffect, useState } from 'react';

const VideoChat = () => {
    const localVideo = useRef();
    const remoteVideo = useRef();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const ws = useRef(null);
    const pc = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket('ws://localhost:3001');

        ws.current.onmessage = async (message) => {
            const data = JSON.parse(message.data);

            if (data.type === 'match') {
                startPeer();
            } else if (data.type === 'offer') {
                await startPeer(false, data.offer);
            } else if (data.type === 'answer') {
                await pc.current.setRemoteDescription(data.answer);
            } else if (data.type === 'candidate') {
                await pc.current.addIceCandidate(data.candidate);
            } else if (data.type === 'text') {
                setMessages(prev => [...prev, { type: 'remote', text: data.text }]);
            } else if (data.type === 'partner-disconnected') {
                alert('Partner disconnected.');
                window.location.reload();
            }
        };

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                localVideo.current.srcObject = stream;
            });

        return () => {
            ws.current.close();
            if (pc.current) pc.current.close();
        };
    }, []);

    const startPeer = async (initiator = true, remoteOffer = null) => {
        pc.current = new RTCPeerConnection();

        pc.current.onicecandidate = event => {
            if (event.candidate) {
                ws.current.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
        };

        pc.current.ontrack = event => {
            remoteVideo.current.srcObject = event.streams[0];
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
        ws.current.send(JSON.stringify({ type: 'text', text: input }));
        setMessages(prev => [...prev, { type: 'local', text: input }]);
        setInput('');
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4">
            <div className="flex gap-4">
                <video ref={localVideo} autoPlay muted className="w-48 h-36 bg-black" />
                <video ref={remoteVideo} autoPlay className="w-48 h-36 bg-black" />
            </div>

            <div className="w-full max-w-md">
                <div className="border h-48 overflow-y-auto p-2 mb-2 bg-white rounded">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={msg.type === 'local' ? 'text-right' : 'text-left'}>
                            <span className="p-1 bg-blue-200 rounded">{msg.text}</span>
                        </div>
                    ))}
                </div>
                <div className="flex">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="border flex-grow p-2 rounded-l"
                    />
                    <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded-r">Send</button>
                </div>
            </div>
        </div>
    );
};

export default VideoChat;
