const body = document.getElementsByTagName('body')[0];

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

function addVideo(id, stream, className, muted) {
    const video = document.createElement('video');
    video.id = id;
    video.srcObject = stream;
    video.className = className;
    video.muted = muted;
    video.autoplay = true;
    body.appendChild(video);
}

Promise.all([
    newPeer(),
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
]).then(values => {
    const peer = values[0];
    const localStream = values[1];
    addVideo('local-video', localStream, 'local-video', true);
    const room = peer.joinRoom('parallel', { mode: 'mesh', localStream });
    room.on('stream', remoteStream => {
        addVideo(stream.peerId, remoteStream, 'remote-video', false);
    });
    room.on('peerLeave', remotePeerId => {
        body.removeChild(document.getElementById(remotePeerId));
    });
}).catch(error => {
    console.error(error);
});
