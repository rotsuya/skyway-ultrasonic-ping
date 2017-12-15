import { CreateStreamWithPing, DetectorPing } from './ultrasonic-ping.js';

const audioCxt = new AudioContext();

function newPeer() {
    return new Promise((resolve, reject) => {
        const peer = new Peer({ key: 'e380f057-d9e0-4939-9049-05bc6c40f94e' });
        peer.on('open', () => {
            resolve(peer);
        });
        peer.on('error', error => {
            reject(error);
        });
    });
}


Promise.all([
    newPeer(),
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
]).then(values => {
    const peer = values[0];
    const localStream = values[1];
    const createStreamWithPing = new CreateStreamWithPing(audioCxt, localStream);
    const room = peer.joinRoom('parallel', { mode: 'mesh', stream: createStreamWithPing.stream });
    room.on('stream', remoteStream => {
        function getAudioSource(stream) {
            return new Promise((resolve, reject) => {
                if (navigator.userAgent.search(/Chrome/) !== -1) {
                    const audio = new Audio();
                    audio.srcObject = stream;
                    audio.addEventListener('loadedmetadata', () => {
                        resolve(audioCxt.createMediaStreamSource(audio.srcObject));
                    });
                }
                resolve(audioCxt.createMediaStreamSource(stream));
            });
        }

        getAudioSource(remoteStream)
            .then(source => {
                //source.connect(audioCxt.destination);
                window.detectorPing = new DetectorPing(audioCxt, source);
            });
    });
    room.on('peerLeave', remotePeerId => {
    });
}).catch(error => {
    console.error(error);
});
