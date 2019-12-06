let userId = 'mod1'

let comments = []//[{id: 'spdofk', text: 'this is a comment', user: 'stupiduser'},
                //{id: 'dasd', text: 'this is another comment', user: 'blauser'}]

$(() =>
{
    $('#submitbutton').on('click', () =>
    {
        let comment = $("#commentbox").val()
        sendComment(comment)
    })

    updateTable()
})

let updateTable = () =>
{
    var content = `<table style="width:100%"><tr><th style="width:10%">User</th><th>Comment</th><th style="width:10%">Approval</th>`

    for (let comment of comments)
    {
        content += `<tr><td>${comment.user}</td><td>${comment.text}</td><td>yes/no</td></tr>`
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
    sendToServer('hello', { id: uid })
}

let sendComment = (comment) =>
{
    sendToServer('comment', { comment: comment })
}

let ws = new WebSocket(getWebsocketServerUri())

ws.onmessage = (event) =>
{
    let json = JSON.parse(event.data)

    if (json.type == 'queueInfo')
    {
        // let asd
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
}