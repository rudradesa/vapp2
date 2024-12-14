import React, { useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import { faMicrophone, faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons";  
import AssignmentIcon from "@mui/icons-material/Assignment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import process from 'process/browser';
import img from "./image.png"

window.process = process;

const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState("");
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [videoEnabled, setVideoEnabled] = useState(true); // Video state
  const [audioEnabled, setAudioEnabled] = useState(true); // Mic state

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
   

    navigator.mediaDevices
  .getUserMedia({ video: videoEnabled, audio: audioEnabled })
  .then((stream) => {
    setStream(stream);
    if (myVideo.current) {
      myVideo.current.srcObject = stream;
    }
  })
  .catch((err) => {
    console.error("Error accessing media devices:", err);
    alert("Could not access video. Please check permissions or device settings.");
  });

  navigator.mediaDevices.enumerateDevices().then((devices) => {
    const videoDevices = devices.filter((device) => device.kind === "videoinput");
    if (videoDevices.length === 0) {
      alert("No camera found on this device.");
    }
  });
  
    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
    };
  }, [videoEnabled, audioEnabled]);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const toggleVideo = () => {
    setVideoEnabled((prev) => !prev);
  };

  const toggleAudio = () => {
    setAudioEnabled((prev) => !prev);
  };

  return (
    <div className="App">
      <h1>ZeroFad</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && videoEnabled ? (
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: "300px", height: "300px" }}
              />
            ) : (
              <img src={img} alt="No Video" style={{ width: "300px", height: "300px" }} />
            )}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "300px", height: "300px" }}
              />
            ) : null}
          </div>
        </div>
        <div className="myId">
          <TextField
            id="filled-basic"
            label="Name"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <CopyToClipboard text={me}>
            <button variant="contained" color="primary">
              <AssignmentIcon fontSize="large" /> Copy ID
            </button>
          </CopyToClipboard>

          <TextField
            id="filled-basic"
            label="ID to call"
            variant="filled"
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </button>
            ) : (
              <IconButton color="primary" aria-label="call" onClick={() => callUser(idToCall)}>
                Call
              </IconButton>
            )}
          </div>

          {/* Video on/off button */}
          <button onClick={toggleVideo}>
            {videoEnabled ? "Turn Off Video" : "Turn On Video"}
          </button>

          {/* Mic on/off button */}
          <button onClick={toggleAudio}>
            {audioEnabled ? "Mute Mic" : "Unmute Mic"}
            <FontAwesomeIcon
              icon={audioEnabled ? faMicrophone : faMicrophoneSlash}  // Conditionally render mic icon
            />
          </button>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;