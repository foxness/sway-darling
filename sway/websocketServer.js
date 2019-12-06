let WebSocket = require('ws')
let Globals = require('./globals')
var debug = require('debug')('sway:server')

let wss = new WebSocket.Server({ server: Globals.httpServer })

wss.on('connection', (connection, req) =>
{
    let firstMessageReceived = false
    let userId = null

    connection.on('message', async(message) =>
    {
        let json = JSON.parse(message)

        debug(`received: ${message}`)

        if (!firstMessageReceived)
        {
            if (json.type == 'hello')
            {
                for (let user of Globals.users)
                {
                    if (user.id == json.value.id)
                    {
                        userId = user.id
                        user.connection = connection
                        break
                    }
                }
            }

            if (!userId)
            {
                connection.terminate()
                return
            }

            firstMessageReceived = true
        }

        switch (json.type)
        {
            case 'comment':
                {
                    debug(json.value)

                    break
                }
            
            default: throw new Error('ACHTUNG: HACKER DETECTED')
        }
    })
})

Globals.sendQueueInfoToUser = async(userId) =>
{
    Globals.sendToUser(userId, { type: 'queueInfo', value: await getQueueInfo(userId) })
}

Globals.sendToUser = (userId, obj) =>
{
    let sent = JSON.stringify(obj)
    Globals.users[userId].wsConnection.send(sent)
}

module.exports = wss