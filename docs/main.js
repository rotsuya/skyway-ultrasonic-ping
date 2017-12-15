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

function playAudio(stream) {
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

    getAudioSource(stream)
        .then(source => {
            source.connect(audioCxt.destination);
        });
}

Promise.all([
    newPeer(),
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
]).then(values => {
    const peer = values[0];
    const localStream = values[1];
    const room = peer.joinRoom('parallel', { mode: 'mesh', stream: localStream });
    room.on('stream', remoteStream => {
        playAudio(remoteStream);
    });
    room.on('peerLeave', remotePeerId => {
    });
}).catch(error => {
    console.error(error);
});
