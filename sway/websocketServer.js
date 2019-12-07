let WebSocket = require('ws')
let Globals = require('./globals')
let Timer = require('./timer')
let moment = require('moment')
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

let modBusyness = (userid) =>
{
    return Globals.users[userid].comments.length
}

let getLeastBusyModButNot = (id) =>
{
    let mods = Object.keys(Globals.users).filter(id => Globals.users[id].type == 'mod')
    if (mods.length == 0)
    {
        return null
    }

    mods.sort((ida, idb) => { return modBusyness(ida) - modBusyness(idb) })

    if (id != null)
    {
        if (mods[0] == id)
        {
            return mods[1]
        }
        else
        {
            return mods[0]
        }
    }

    return mods[0]
}

let getLeastBusyMod = () =>
{
    return getLeastBusyModButNot(null)
}

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
                    let u = { type: json.value.type, connection: connection }

                    if (u.type == 'mod')
                    {
                        u.comments = []
                    }

                    Globals.users[userId] = u
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

                    let mod = getLeastBusyMod()
                    if (mod != null)
                    {
                        Globals.users[mod].comments.push(id)

                        let timer = new Timer(moment.duration(10, 's'))
                        timer.on('tick', () =>
                        {
                            let mods = Object.keys(Globals.users).filter((u) => Globals.users[u].type == 'mod')
                            if (mods.length == 1)
                            {
                                return
                            }

                            let oldmod = mods.find(u => Globals.users[u].comments.includes(id))
                            let newmod = getLeastBusyModButNot(oldmod)

                            let i = Globals.users[oldmod].comments.indexOf(id);
                            Globals.users[oldmod].comments.splice(i, 1)

                            Globals.users[newmod].comments.push(id)

                            Globals.sendCommentsToMods()
                        })
                        timer.start()

                        Globals.comments[id] = { text: text, user: user, status: status, timer: timer }
                        Globals.sendCommentsToMods()
                    }

                    break
                }
            
            case 'getComments':
                {
                    if (Globals.users[userId].type == 'mod')
                    {
                        Globals.sendCommentsToMod(userId)
                    }
                    else
                    {
                        Globals.sendCommentsToUser(userId)
                    }

                    break
                }
            
            case 'approveComment':
                {
                    Globals.comments[json.value.commentId].timer.stop()
                    Globals.comments[json.value.commentId].timer = null
                    Globals.comments[json.value.commentId].status = 'approved'

                    Globals.sendCommentsToMods()
                    Globals.sendCommentsToUsers()

                    break
                }
            
            case 'disapproveComment':
                {
                    Globals.comments[json.value.commentId].timer.stop()
                    delete Globals.comments[json.value.commentId]

                    Globals.sendCommentsToMods()

                    break
                }
            
            default: throw new Error('ACHTUNG: HACKER DETECTED')
        }
    })
})

Globals.sendToUser = (userId, obj) =>
{
    let sent = JSON.stringify(obj)
    debug(`sending ${sent} to ${userId}`)
    Globals.users[userId].connection.send(sent)
}

Globals.sendCommentsToUser = (userId_) =>
{
    let comments = Globals.convertToUserComments()
    Globals.sendToUser(userId_, { type: 'comments', value: { comments: comments } } )
}

Globals.sendCommentsToMod = (mod) =>
{
    let comments = Globals.convertToModComments(mod)
    Globals.sendToUser(mod, { type: 'comments', value: { comments: comments } } )
}

Globals.convertToUserComments = () =>
{
    let comments = {}

    for (let commentId in Globals.comments)
    {
        let comment = Globals.comments[commentId]

        if (comment.status == 'approved')
        {
            comments[commentId] = { user: comment.user, text: comment.text }
        }
    }

    return comments
}

Globals.convertToModComments = (mod) =>
{
    let comments = {}

    for (let commentId in Globals.comments)
    {
        let comment = Globals.comments[commentId]

        if (Globals.users[mod].comments.includes(commentId))
        {
            comments[commentId] = { status: comment.status, user: comment.user, text: comment.text }
        }
    }

    return comments
}

Globals.sendCommentsToUsers = () =>
{
    let comments = Globals.convertToUserComments()

    for (let userId_ in Globals.users)
    {
        if (Globals.users[userId_].type == 'user')
        {
            Globals.sendToUser(userId_, { type: 'comments', value: { comments: comments } } )
        }
    }
}

Globals.sendCommentsToMods = () =>
{
    for (let mod in Globals.users)
    {
        if (Globals.users[mod].type == 'mod')
        {
            Globals.sendCommentsToMod(mod)
        }
    }
}

module.exports = wss