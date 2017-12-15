class CreateStreamWithPing {
    constructor(audioCxt, stream) {
        const frequency = 440;

        const source = audioCxt.createMediaStreamSource(stream);

        const oscillator = audioCxt.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        oscillator.start();

        const gainNode = audioCxt.createGain();
        gainNode.gain.value = 1;

        const destination = audioCxt.createMediaStreamDestination();

        source.connect(destination);
        oscillator.connect(gainNode);
        gainNode.connect(destination);
        const outputStream = destination.stream;

        this.gainNode = gainNode;
        this.stream = outputStream;
    }

    turnOn() {
        this.gainNode.gain.value = 1;
    }

    turnOff() {
        this.gainNode.gain.value = 0;
    }
}

class DetectorPing {
    constructor(audioCxt, source) {
        const frequency = 440;
        const gFilter = createGoertzelFilter(audioCxt, frequency);
        gFilter.setFreq(440);
        source.connect(gFilter);

        this.res = gFilter.res;
    }

    getLevel() {
        return this.res;
    }
}

function createGoertzelFilter(context, freq) {

    if (typeof freq !== "number") throw new Error("Need frequency!");

    var
        w = 2 * Math.PI * freq / context.sampleRate,
        wr = Math.cos(w),
        wi = Math.sin(w),
        coeff = 2 * wr,
        g = context.createScriptProcessor(256, 1, 1);

    g.wr = wr;
    g.wi = wi;
    g.coeff = coeff;

    g.onaudioprocess = function(e) {
        var
            inp = e.inputBuffer.getChannelData(0),
            N = inp.length,
            coeff = this.coeff,
            s1 = 0,
            s2 = 0;

        for (var n = 0; n < N; n+=2) {
            s2 = inp[n] + coeff * s1 - s2;
            s1 = inp[n+1] + coeff * s2 - s1;
        }

        var
            XKr = s1 * this.wr - s2,
            XKi = s1 * this.wi,
            res = (XKr*XKr + XKi*XKi) / N;

        this.res = res;
        console.log(res);
    };

    g.setFreq = function(newFreq) {
        freq = newFreq;
        w = 2*Math.PI * freq / context.sampleRate;
        wr = Math.cos(w);
        wi = Math.sin(w);
        coeff = 2 * wr;
        g.wr = wr;
        g.wi = wi;
        g.coeff = coeff;
    };

    return g;
}


export { CreateStreamWithPing, DetectorPing };