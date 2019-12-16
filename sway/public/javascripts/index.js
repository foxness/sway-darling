$(() =>
{
    $('#userbutton').on('click', () =>
    {
        let name = $("#namebox").val().trim()
        if (name == '')
        {
            name = 'unnamedUser'
        }

        window.location.href = getUserUri(name, false);
    })

    $('#moderatorbutton').on('click', () =>
    {
        let name = $("#namebox").val().trim()
        if (name == '')
        {
            name = 'unnamedModerator'
        }

        window.location.href = getUserUri(name, true);
    })
})

let getUserUri = (name, moderator) =>
{
    let host = /https?:\/\/([^/]+)/
    return `http://${host.exec(window.location.href)[1]}/${moderator ? 'moderate' : 'comment'}?userid=${name}`
}