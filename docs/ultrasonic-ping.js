class CreateStreamWithPing {
    constructor(audioCxt, source) {
        const frequency = 15000;
        this.intervalMillisec = 3000;
        this.durationMillisec = 100;

        const oscillator = audioCxt.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        oscillator.start();

        this.gainNode = audioCxt.createGain();
        this.gainNode.gain.value = 0;

        const destination = audioCxt.createMediaStreamDestination();

        source.connect(destination);
        oscillator.connect(this.gainNode);
        this.gainNode.connect(destination);
        this.stream = destination.stream;
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
        const frequency = 15000;
        this.events = [];
        this.threshold = 0.5;
        this.intervalMillisec = 3000;
        this.durationMillisec = 100;
        this.noPingCounter = 0;
        this.isConnected = false;
        this.timer = 0;

        const analyser = audioCxt.createAnalyser();
        this.gFilter = createGoertzelFilter(audioCxt, frequency);
        source.connect(this.gFilter);
        this.gFilter.connect(analyser);

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
        this.timer = setInterval(() => {
            const level = this.getLevel();
            if (level > this.threshold) {
                this.events['ping'](level);
                this.noPingCounter = 0;
                if (!this.isConnected) {
                    this.isConnected = true;
                    this.events['connected']();
                }
            } else {
                this.noPingCounter++;
                if (this.isConnected && (this.noPingCounter > (this.intervalMillisec / this.durationMillisec * 1.5))) {
                    this.isConnected = false;
                    this.events['disconnected']();
                }
            }
        }, this.durationMillisec);
    }

    stop() {
        clearInterval(this.timer);
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

        for (var n = 0; n < N; n += 2) {
            s2 = inp[n] + coeff * s1 - s2;
            s1 = inp[n+1] + coeff * s2 - s1;
        }

        var
            XKr = s1 * g.wr - s2,
            XKi = s1 * g.wi,
            res = (XKr * XKr + XKi * XKi) / N;

        g.res = res;
    };

    g.setFreq = function(newFreq) {
        freq = newFreq;
        w = 2 * Math.PI * freq / context.sampleRate;
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