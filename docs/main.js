import { CreateStreamWithPing, PingDetector } from './ultrasonic-ping.js';

const audioCxt = new AudioContext();
window.log = {};
window.remotePeerIds = [];
window.localPeerId = '';

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
    window.localPeerId = peer.id;
    drawSVG(0, 1, [window.localPeerId]);
    const localSource = audioCxt.createMediaStreamSource(localStream);
    const createStreamWithPing = new CreateStreamWithPing(audioCxt, localSource);
    createStreamWithPing.start();
    const room = peer.joinRoom('parallel', { mode: 'mesh', stream: createStreamWithPing.stream });
    const pingDetectors = {};
    room.on('stream', remoteStream => {
        window.remotePeerIds.push(remoteStream.peerId);
        drawSVG(window.remotePeerIds.length, window.remotePeerIds.length + 1, [window.localPeerId].concat(window.remotePeerIds));
        console.log(window.remotePeerIds.length, window.remotePeerIds.length + 1);
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
                const pingDetector = new PingDetector(audioCxt, source, audioCxt.destination);
                const from = remoteStream.peerId;
                const to = peer.id;
                pingDetectors[remoteStream.peerId] = pingDetector;
                pingDetector.on('ping', level => {
                });
                pingDetector.on('disconnected', () => {
                    const time = Date.now();
                    console.log('disconnected', from, to, time);
                    updateLineStyle(from, to, 'disconnected', [window.localPeerId].concat(window.remotePeerIds));
                    room.send(['disconnected', from, to, time]);
                });
                pingDetector.on('connected', () => {
                    const time = Date.now();
                    console.log('connected', from, to, time);
                    updateLineStyle(from, to, 'connected', [window.localPeerId].concat(window.remotePeerIds));
                    room.send(['connected', from, to, time]);
                });
                pingDetector.start();
            });
    });

    room.on('peerLeave', remotePeerId => {
        pingDetectors[remotePeerId].stop();
        window.remotePeerIds.splice(window.remotePeerIds.indexOf(remotePeerId), 1);
        drawSVG(window.remotePeerIds.length + 2, window.remotePeerIds.length + 1, [window.localPeerId].concat(window.remotePeerIds));
        console.log(window.remotePeerIds.length + 2, window.remotePeerIds.length + 1);
    });

    room.on('data', (data) => {
        const event = data.data[0];
        const from = data.data[1];
        const to = data.data[2];
        const time = data.data[3];
        console.log(event, from, to, time);
        updateLineStyle(from, to, event, [window.localPeerId].concat(window.remotePeerIds));
    })
}).catch(error => {
    console.error(error);
});

function drawSVG(numberOfPeersBefore, numberOfPeersAfter, peerIds) {
    removeLines(numberOfPeersBefore);
    removeCircles(numberOfPeersBefore);
    removeTexts(numberOfPeersBefore);
    drawLines(numberOfPeersAfter);
    drawCircles(numberOfPeersAfter);
    drawTexts(numberOfPeersAfter, peerIds);
}

function updateLineStyle(peerIdFrom, peerIdTo, event, peerIds) {
    const from = peerIds.indexOf(peerIdFrom);
    const to = peerIds.indexOf(peerIdTo);
    const id = 'line-' + from + '-' + to;
    const line = document.getElementById(id);
    switch (event) {
        case 'disconnected':
            line.classList.add('stopped');
            break;
        case 'connected':
            if (line.classList.contains('stopped')) {
                line.classList.remove('stopped');
            }
            break;
    }

}

const svg = document.getElementById('svg');
const cr = 10;
const r = 180;
const width = 640;
const height = 640;
const spacing = 20;

function appendElement(name, properties, parent) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(properties).forEach(key => {
        element.setAttribute(key, properties[key]);
    });
    svg.appendChild(element);
    return element;
}

function drawCircles(numberOfPeers) {
    const coordinates = getCoordinates(numberOfPeers);
    for (let i = 0; i < numberOfPeers; i++) {
        appendElement('circle', {
            class: 'circle',
            id: 'circle-' + i,
            cx: coordinates[i][0],
            cy: coordinates[i][1],
            r: cr
        } , svg);
    }
}

function drawLines(numberOfPeers) {
    const coordinates = getCoordinates(numberOfPeers);
    for (let i = 0; i < numberOfPeers; i++) {
        for (let j = 0; j < numberOfPeers; j++) {
            if (i === j) {
                continue;
            }
            const dX = coordinates[j][0] - coordinates[i][0];
            const dY = -(coordinates[j][1] - coordinates[i][1]);
            const medianX = (coordinates[i][0] + coordinates[j][0]) * .5;
            const medianY = (coordinates[i][1] + coordinates[j][1]) * .5;
            let angle = 0;
            if (dX === 0) {
                if (dY > 0) {
                    angle = Math.PI * .5;
                } else {
                    angle = -Math.PI * .5;
                }
            } else {
                angle = Math.atan(dY / dX);
            }
            if (dX < 0) {
                angle += Math.PI;
            }
            const offsetX = spacing * .5 * Math.cos(angle + Math.PI * .5);
            const offsetY = -spacing * .5 * Math.sin(angle + Math.PI * .5);
            appendElement('path', {
                class: 'line',
                id: 'line-' + i + '-' + j,
                d: 'M ' + coordinates[i][0] + ',' + coordinates[i][1]
                + ' Q ' + (medianX + offsetX) + ',' + (medianY + offsetY)
                + ' ' + coordinates[j][0] + ',' + coordinates[j][1]
            }, svg);
        }
    }
}

function drawTexts(numberOfPeers, labels) {
    const coordinates = getCoordinates(numberOfPeers);
    for (let i = 0; i < numberOfPeers; i++) {
        let textAnchor = '';
        let dominantBaseline = '';
        let dx = 0;
        let dy = 0;
        const degree = coordinates[i][2] / Math.PI * 180;
        if (degree < 45 || degree > 315) {
            textAnchor = 'middle';
            dominantBaseline = 'alphabetic';
            dy = -cr - 5;
        } else if (degree <= 135) {
            textAnchor = 'start';
            dominantBaseline = 'middle';
            dx = cr + 5;
        } else if (degree < 225) {
            textAnchor = 'middle';
            dominantBaseline = 'text-before-edge';
            dy = cr + 5;
        } else {
            textAnchor = 'end';
            dominantBaseline = 'middle';
            dx = -cr - 5;
        }
        const text = appendElement('text', {
            class: 'text',
            id: 'text-' + i,
            x: coordinates[i][0],
            y: coordinates[i][1],
            dx: dx,
            dy: dy,
            'text-anchor': textAnchor,
            'dominant-baseline': dominantBaseline
        } , svg);
        const textNode = document.createTextNode(labels[i]);
        text.appendChild(textNode);
    }
}

function removeCircles(numberOfPeers) {
    for (let i = 0; i < numberOfPeers; i++) {
        removeElement('circle-' + i, svg);
    }
}

function removeLines(numberOfPeers) {
    for (let i = 0; i < numberOfPeers; i++) {
        for (let j = 0; j < numberOfPeers; j++) {
            if (i === j) {
                continue;
            }
            removeElement('line-' + i + '-' + j, svg);
        }
    }
}

function removeTexts(numberOfPeers) {
    for (let i = 0; i < numberOfPeers; i++) {
        removeElement('text-' + i, svg);
    }
}

function removeElement(id, svg) {
    const element = document.getElementById(id);
    svg.removeChild(element);
}

function getCoordinates(apexes) {
    const coordinates = [];
    for (let i = 0; i < apexes; i++) {
        const angle = Math.PI * 2 / apexes * i;
        const cx = width / 2 + r * Math.sin(angle);
        const cy = height / 2 - r * Math.cos(angle);
        coordinates.push([cx, cy, angle]);
    }
    return coordinates;
}
