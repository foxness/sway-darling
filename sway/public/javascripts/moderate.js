let searchParams = new URLSearchParams(window.location.search)
let userId = searchParams.get('userid') || 'unnamedMod'

let comments = {}//[{id: 'spdofk', text: 'this is a comment', user: 'stupiduser'},
                //{id: 'dasd', text: 'this is another comment', user: 'blauser'}]

$(() =>
{
    updateTable()
})

let updateTable = () =>
{
    var content = `<table style="width:100%"><tr><th style="width:10%">User</th><th>Comment</th><th style="width:10%">Approval</th>`

    for (let commentId in comments)
    {
        let comment = comments[commentId]

        if (comment.status != 'pending')
        {
            continue;
        }

        let goodbutton = `<input id='${commentId}g' type='button' value='Good'>`
        let badbutton = `<input id='${commentId}b' type='button' value='Bad'>`
        let approvalcontent = comment.status == 'pending' ? `${goodbutton}${badbutton}` : 'approved'
        content += `<tr><td>${comment.user}</td><td>${comment.text}</td><td>${approvalcontent}</td></tr>`
    }

    content += "</table>"

    $('#tablediv').html(content)

    for (let commentId in comments)
    {
        $(`#${commentId}g`).on('click', () =>
        {
            sendApproveComment(commentId)
        })

        $(`#${commentId}b`).on('click', () =>
        {
            sendDisapproveComment(commentId)
        })
    }
}

let getWebsocketServerUri = () =>
{
    let host = /https?:\/\/([^/]+)/
    return `ws://${host.exec(window.location.href)[1]}`
}

let sendToServer = (type, value) =>
{
    ws.send(JSON.stringify({ type: type, value: value }))
}

let sendHello = (uid) =>
{
    sendToServer('hello', { id: uid, type: 'mod' })
}

let sendComment = (comment) =>
{
    sendToServer('comment', { comment: comment })
}

let requestComments = () =>
{
    sendToServer('getComments', null)
}

let sendApproveComment = (commentId) =>
{
    sendToServer('approveComment', { commentId: commentId })
}

let sendDisapproveComment = (commentId) =>
{
    sendToServer('disapproveComment', { commentId: commentId })
}

let ws = new WebSocket(getWebsocketServerUri())

ws.onmessage = (event) =>
{
    let json = JSON.parse(event.data)

    if (json.type == 'comments')
    {
        comments = json.value.comments
        updateTable()
    }
    else if (json.type == 'imgurInfo')
    {
        // asd
    }
    else
    {
        alert(`Unknown server response: ${event.data}`)
    }
}

ws.onopen = (event) =>
{
    sendHello(userId)
    requestComments()
}