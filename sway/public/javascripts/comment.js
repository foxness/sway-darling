$(() =>
{
    $('#submitbutton').on('click', () =>
    {
        alert(getWebsocketServerUri())
    })

    let getWebsocketServerUri = () =>
    {
        let host = /https?:\/\/([^/]+)/
        return `ws://${host.exec(window.location.href)[1]}`
    }

    ws = new WebSocket(getWebsocketServerUri())
})