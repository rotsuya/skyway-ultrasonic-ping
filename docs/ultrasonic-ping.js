class CreateStreamWithPing {
    constructor(audioCxt, source) {
        const frequency = 16000;
        const intervalMillisec = 3000;
        const durationMillisec = 100;

        const oscillator = audioCxt.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        oscillator.start();

        const gainNode = audioCxt.createGain();
        gainNode.gain.value = 0;

        const destination = audioCxt.createMediaStreamDestination();

        source.connect(destination);
        oscillator.connect(gainNode);
        gainNode.connect(destination);
        const outputStream = destination.stream;

        this.intervalMillisec = intervalMillisec;
        this.durationMillisec = durationMillisec;
        this.gainNode = gainNode;
        this.stream = outputStream;
    }

    turnOn() {
        this.gainNode.gain.value = 1;
    }

    turnOff() {
        this.gainNode.gain.value = 0;
    }

    start() {
        setInterval(() => {
            this.turnOn();
            setTimeout(() => {
                this.turnOff();
            }, this.durationMillisec);
        }, this.intervalMillisec);
    }
}

class PingDetector {
    constructor(audioCxt, source, destination) {
        const frequency = 16000;
        const intervalMillisec = 100;
        const threshold = 0.5;
        const gFilter = createGoertzelFilter(audioCxt, frequency);
        const analyser = audioCxt.createAnalyser();
        const events = {};

        source.connect(gFilter);
        gFilter.connect(analyser);

        this.gFilter = gFilter;
        this.events = [];
        this.threshold = threshold;
        this.intervalMillisec = intervalMillisec;

        const lowpassFilter = audioCxt.createBiquadFilter();
        lowpassFilter.type = 'lowpass';
        lowpassFilter.frequency.value = frequency * 0.95;

        source.connect(lowpassFilter);
        lowpassFilter.connect(destination);
    }

    getLevel() {
        return this.gFilter.res;
    }

    on(type, callback) {
        this.events[type] = callback;
    }

    start() {
        setInterval(() => {
            const level = this.getLevel();
            if (level > this.threshold) {
                this.events['ping'](level);
            }
        }, this.intervalMillisec);
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

        g.res = res;
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


export { CreateStreamWithPing, PingDetector };