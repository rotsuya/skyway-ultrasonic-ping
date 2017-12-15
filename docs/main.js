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
                    // console.log('receive ping from', remoteStream.peerId, 'to', peer.id, 'at', Date.now(), 'in level', level);
                    room.send([remoteStream.peerId, peer.id, Date.now()]);
                    drawTable(remoteStream.peerId, peer.id, Date.now());
                });
                pingDetector.start();
            });
    });
    room.on('peerLeave', remotePeerId => {
    });

    room.on('data', (data) => {
        console.log(data.data);
        const from = data.data[0];
        const to = data.data[1];
        const time = data.data[2];
        drawTable(from, to, time);
    })
}).catch(error => {
    console.error(error);
});

function drawTable(from, to, time) {
    const key = from + '-' + to;
    let tdStatus;
    if (log[key]) {
        tdStatus = document.querySelector('#tr-' + key + ' .status');
    } else {
        const tdFrom = document.createElement('td');
        tdFrom.textContent = from;
        tdFrom.className = 'from';
        const tdTo = document.createElement('td');
        tdTo.textContent = to;
        tdTo.className = 'to';
        tdStatus = document.createElement('td');
        tdStatus.textContent = 'live';
        tdStatus.className = 'status live';
        const tr = document.createElement('tr');
        tr.id = 'tr-' + key;
        tr.appendChild(tdFrom);
        tr.appendChild(tdTo);
        tr.appendChild(tdStatus);
        document.getElementById('tbody').appendChild(tr);
    }
    tdStatus.classList.remove('live');
    setTimeout(() => {
        tdStatus.classList.add('live');
    }, 100);
    log[key] = time;
}
