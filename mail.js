var {google} = require('googleapis');

function makeBody(to, from, subject, message) {
    var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "bcc: ", from, "\n",
        "subject: ", subject, "\n\n",
        message
    ].join('');

    var encodedMail = new Buffer(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
    return encodedMail;
}

exports.sendMessage = function(auth, sender, toEmail, message){
    const gmail = google.gmail({version: 'v1', auth});
    var raw = makeBody(toEmail, sender,
                       '[MIRA Jeugdkern] Laika Says Notificatie',
                        message);

    console.log(`Sending mail from ${sender} -> ${toEmail}`);

    gmail.users.messages.send({
        auth: auth,
        userId: 'me',
        resource: {
            raw: raw
        }
    }, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        else{
            console.log('Laika send some stuff. And with great success.');
        }
    });
}
