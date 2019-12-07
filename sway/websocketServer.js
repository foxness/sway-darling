let WebSocket = require('ws')
let Globals = require('./globals')
let Timer = require('./timer')
let moment = require('moment')
var debug = console.log

let wss = new WebSocket.Server({ server: Globals.httpServer })

let ausers = {}
let acomments = {}

let interval = moment.duration(1, 'm')

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
    return ausers[userid].comments.length
}

let getLeastBusyModButNot = (id) =>
{
    let mods = Object.keys(ausers).filter(id => ausers[id].type == 'mod')
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
                for (let userId_ in ausers)
                {
                    if (userId_ == json.value.id)
                    {
                        found = true
                        userId = userId_
                        ausers[userId].connection = connection
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

                    ausers[userId] = u

                    if (u.type == 'mod')
                    {
                        let comments = Object.keys(acomments).filter(c =>
                        {
                            let free = true

                            for (let au in ausers)
                            {
                                if (ausers[au].type == 'mod' && ausers[au].comments.includes(c))
                                {
                                    free = false
                                    break
                                }
                            }

                            return free && acomments[c].status == 'pending'
                        })

                        for (let id of comments)
                        {
                            ausers[userId].comments.push(id)
                            
                            let timer = new Timer(interval)
                            timer.on('tick', () =>
                            {
                                let mods = Object.keys(ausers).filter((u) => ausers[u].type == 'mod')
                                if (mods.length == 1)
                                {
                                    return
                                }
        
                                let oldmod = mods.find(u => ausers[u].comments.includes(id))
                                let newmod = getLeastBusyModButNot(oldmod)
        
                                let i = ausers[oldmod].comments.indexOf(id);
                                ausers[oldmod].comments.splice(i, 1)
        
                                ausers[newmod].comments.push(id)
        
                                sendCommentsToMods()
                            })
                            timer.start()

                            acomments[id].timer = timer
                        }

                        sendCommentsToMods()
                    }
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
                        ausers[mod].comments.push(id)

                        let timer = new Timer(interval)
                        timer.on('tick', () =>
                        {
                            let mods = Object.keys(ausers).filter((u) => ausers[u].type == 'mod')
                            if (mods.length == 1)
                            {
                                return
                            }

                            let oldmod = mods.find(u => ausers[u].comments.includes(id))
                            let newmod = getLeastBusyModButNot(oldmod)

                            let i = ausers[oldmod].comments.indexOf(id);
                            ausers[oldmod].comments.splice(i, 1)

                            ausers[newmod].comments.push(id)

                            sendCommentsToMods()
                        })
                        timer.start()

                        acomments[id] = { text: text, user: user, status: status, timer: timer }
                        sendCommentsToMods()
                    }
                    else
                    {
                        acomments[id] = { text: text, user: user, status: status, timer: null }
                    }

                    break
                }
            
            case 'getComments':
                {
                    if (ausers[userId].type == 'mod')
                    {
                        sendCommentsToMod(userId)
                    }
                    else
                    {
                        sendCommentsToUser(userId)
                    }

                    break
                }
            
            case 'approveComment':
                {
                    acomments[json.value.commentId].timer.stop()
                    acomments[json.value.commentId].timer = null
                    acomments[json.value.commentId].status = 'approved'

                    sendCommentsToMods()
                    sendCommentsToUsers()

                    break
                }
            
            case 'disapproveComment':
                {
                    acomments[json.value.commentId].timer.stop()
                    delete acomments[json.value.commentId]

                    sendCommentsToMods()

                    break
                }
            
            default: throw new Error('ACHTUNG: HACKER DETECTED')
        }
    })
})

let sendToUser = (userId, obj) =>
{
    let sent = JSON.stringify(obj)
    debug(`sending ${sent} to ${userId}`)
    ausers[userId].connection.send(sent)
}

let sendCommentsToUser = (userId_) =>
{
    let comments = convertToUserComments()
    sendToUser(userId_, { type: 'comments', value: { comments: comments } } )
}

let sendCommentsToMod = (mod) =>
{
    let comments = convertToModComments(mod)
    sendToUser(mod, { type: 'comments', value: { comments: comments } } )
}

let convertToUserComments = () =>
{
    let comments = {}

    for (let commentId in acomments)
    {
        let comment = acomments[commentId]

        if (comment.status == 'approved')
        {
            comments[commentId] = { user: comment.user, text: comment.text }
        }
    }

    return comments
}

let convertToModComments = (mod) =>
{
    let comments = {}

    for (let commentId in acomments)
    {
        let comment = acomments[commentId]

        if (ausers[mod].comments.includes(commentId))
        {
            comments[commentId] = { status: comment.status, user: comment.user, text: comment.text }
        }
    }

    return comments
}

let sendCommentsToUsers = () =>
{
    let comments = convertToUserComments()

    for (let userId_ in ausers)
    {
        if (ausers[userId_].type == 'user')
        {
            sendToUser(userId_, { type: 'comments', value: { comments: comments } } )
        }
    }
}

let sendCommentsToMods = () =>
{
    for (let mod in ausers)
    {
        if (ausers[mod].type == 'mod')
        {
            sendCommentsToMod(mod)
        }
    }
}

module.exports = wss