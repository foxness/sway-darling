let searchParams = new URLSearchParams(window.location.search)
let userId = searchParams.get('userid') || 'unnamedUser'

let comments = {}
//<table style="width:100%"><tr><th style="width:10%">User</th><th>Comment</th></tr><tr><td>asd</td><td>Hey</td></tr><tr><td>dsa</td><td>Lalalalalal</td></tr></table>
$(() =>
{
    $('#submitbutton').on('click', () =>
    {
        let comment = $("#commentbox").val()
        $('#commentbox').val('')
        sendComment(comment)
    })
})

let updateTable = () =>
{
    var content = `<table style="width:100%"><tr><th style="width:10%">User</th><th>Comment</th>`

    for (let commentId in comments)
    {
        let comment = comments[commentId]
        content += `<tr><td>${comment.user}</td><td>${comment.text}</td></tr>`
    }

    content += "</table>"

    $('#tablediv').html(content)
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
    sendToServer('hello', { id: uid, type: 'user' })
}

let sendComment = (comment) =>
{
    sendToServer('comment', { comment: comment })
}

let requestComments = () =>
{
    sendToServer('getComments', null)
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