let WebSocket = require('ws')
let Globals = require('./globals')
var debug = console.log

let wss = new WebSocket.Server({ server: Globals.httpServer })

let generateRandomString = (length) =>
{
    let result = ''
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var charactersLength = characters.length
    for (let i = 0; i < length; i++ )
    {
       result += characters.charAt(Math.floor(Math.random() * charactersLength))
    }

    return result
}

let generateId = () => { return generateRandomString(8) }

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
                let found = false
                for (let userId_ in Globals.users)
                {
                    if (userId_ == json.value.id)
                    {
                        found = true
                        userId = userId_
                        Globals.users[userId].connection = connection
                        break
                    }
                }

                if (!found)
                {
                    userId = json.value.id
                    Globals.users[userId] = { type: json.value.type, connection: connection }
                }
            }

            if (!userId)
            {
                connection.terminate()
                return
            }

            firstMessageReceived = true

            debug(`user connected: ${userId}`)
        }

        switch (json.type)
        {
            case 'hello': break
            case 'comment':
                {
                    debug(`${userId} says: "${json.value.comment}"`)

                    let id = generateId()
                    let text = json.value.comment
                    let user = userId
                    let status = 'pending'

                    Globals.comments[id] = { text: text, user: user, status: status }

                    Globals.sendCommentsToMods()

                    break
                }
            
            case 'getComments':
                {
                    Globals.sendCommentsToUser(userId)

                    break
                }
            
            case 'approveComment':
                {
                    Globals.comments[json.value.commentId].status = 'approved'

                    Globals.sendCommentsToMods()

                    break
                }
            
            case 'disapproveComment':
                {
                    delete Globals.comments[json.value.commentId]

                    Globals.sendCommentsToMods()

                    break
                }
            
            default: throw new Error('ACHTUNG: HACKER DETECTED')
        }
    })
})

// Globals.sendQueueInfoToUser = async(userId) =>
// {
//     Globals.sendToUser(userId, { type: 'queueInfo', value: await getQueueInfo(userId) })
// }

Globals.sendToUser = (userId, obj) =>
{
    let sent = JSON.stringify(obj)
    debug(`sending ${sent} to ${userId}`)
    Globals.users[userId].connection.send(sent)
}

Globals.sendCommentsToUser = (userId_) =>
{
    Globals.sendToUser(userId_, { type: 'comments', value: { comments: Globals.comments } } )
}

Globals.sendCommentsToMods = () =>
{
    for (let userId_ in Globals.users)
    {
        if (Globals.users[userId_].type == 'mod')
        {
            Globals.sendCommentsToUser(userId_)
        }
    }
}

module.exports = wss