import { CreateStreamWithPing, PingDetector } from './ultrasonic-ping.js';

const audioCxt = new AudioContext();
window.log = {};

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
    const localSource = audioCxt.createMediaStreamSource(localStream);
    const createStreamWithPing = new CreateStreamWithPing(audioCxt, localSource);
    createStreamWithPing.start();
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
                window.pingDetector = new PingDetector(audioCxt, source, audioCxt.destination);
                pingDetector.on('ping', level => {
                    console.log('receive ping from', remoteStream.peerId, 'to', peer.id, 'at', Date.now(), 'in level', level);
                    const key = remoteStream.peerId + '-' + peer.id;
                    let status;
                    if (log[key]) {
                        console.info(key);
                        status = document.querySelector('#' + key + ' .status');
                    } else {
                        const from = document.createElement('td');
                        from.textContent = remoteStream.peerId;
                        from.className = 'from';
                        const to = document.createElement('td');
                        to.textContent = peer.id;
                        to.className = 'to';
                        status = document.createElement('td');
                        status.textContent = 'live';
                        status.className = 'status live';
                        const tr = document.createElement('tr');
                        tr.id = key;
                        tr.appendChild(from);
                        tr.appendChild(to);
                        tr.appendChild(status);
                        document.getElementById('tbody').appendChild(tr);
                    }
                    console.log(status);
                    status.classList.remove('live');
                    setTimeout(() => {
                        status.classList.add('live');
                    }, 100);
                    log[key] = Date.now();
                });
                pingDetector.start();
            });
    });
    room.on('peerLeave', remotePeerId => {
    });
}).catch(error => {
    console.error(error);
});
