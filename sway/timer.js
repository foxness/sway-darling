let EventEmitter = require('events')
//let moment = require('moment')

class Timer extends EventEmitter
{
    constructor(interval) // moment.duration
    {
        super()
        this.interval = interval
        this.timeoutId = null
    }

    start()
    {
        this.tock()
        this.emit('start')
    }

    tick()
    {
        this.tock()
        this.emit('tick')
    }

    tock()
    {
        this.timeoutId = setTimeout(this.tick.bind(this), this.interval.asMilliseconds())
    }

    stop()
    {
        clearTimeout(this.timeoutId)
        this.timeoutId = null
        this.emit('stop')
    }
}

module.exports = Timer