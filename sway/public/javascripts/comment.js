let searchParams = new URLSearchParams(window.location.search)
let userId = searchParams.get('userid') || 'unnamedUser'

$(() =>
{
    $('#submitbutton').on('click', () =>
    {
        let comment = $("#commentbox").val()
        $('#commentbox').val('')
        sendComment(comment)
    })
})

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

let ws = new WebSocket(getWebsocketServerUri())

// ws.onmessage = (event) =>
// {
//     let json = JSON.parse(event.data)

//     // if (json.type == 'queueInfo')
//     // {
//     //     // let asd
//     // }
//     // else if (json.type == 'imgurInfo')
//     // {
//     //     // asd
//     // }
//     // else
//     // {
//     //     alert(`Unknown server response: ${event.data}`)
//     // }
// }

ws.onopen = (event) =>
{
    sendHello(userId)
}