const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const audiosSelect = document.getElementById("audios");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roonName;
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(
            (device) => device.kind === "videoinput"
        );
        const currentCamera = myStream.getVideoTracks()[0];

        const audios = devices.filter((device) => device.kind === "audioinput");
        const currentAudio = myStream.getAudioTracks()[0];

        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });

        audios.forEach((audio) => {
            const option = document.createElement("option");
            option.value = audio.deviceId;
            option.innerText = audio.label;
            if (currentAudio.label === audio.label) {
                option.selected = true;
            }
            audiosSelect.appendChild(option);
        });
    } catch (error) {
        console.log(error);
    }
}

async function getMedia(deviceId) {
    const initConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initConstrains
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (!muted) {
        muteBtn.innerText = "소리 켜기";
        muted = true;
    } else {
        muteBtn.innerText = "음소거";
        muted = false;
    }
}
function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
        cameraBtn.innerText = "카메라 끄기";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "카메라 켜기";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    await initCall();
    socket.emit("join_room", input.value);
    roonName = input.value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roonName);
});

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roonName);
    console.log("sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

// RTC code

function makeConnection() {
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log(data);
}
