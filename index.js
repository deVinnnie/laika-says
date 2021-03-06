var fs = require('fs');
var readline = require('readline');
var authors = require('parse-authors');
var readline = require('readline');
var token = require('./token.js');
var mail = require('./mail.js');
var argv = require('minimist')(process.argv.slice(2));

var BASE_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + "/MIRA_Jeugdkern/Main";

var ATTENDENCE_ROOT_DIR = BASE_DIR + '/Activiteiten_Main_Sequence'; 
var MAILER = argv['email'];

console.log(`Laika is using ${MAILER} to send emails.`);

var leiding = readMailAddresses();

// Load client secrets from a local file.
let content = fs.readFileSync('client_secret.json');

// Authorize a client with the loaded credentials, then call the main method.
token.authorize(JSON.parse(content), doMain);

/**
* Parse the LEIDING file - which has the same format as an AUTHORS file.
* Returns an array where the key corresponds to the 'nickname' and the value is
* the email-addresss.
* 
* The website / url field is misused as 'nickname' field.
*/
function readMailAddresses(){
    var content = fs.readFileSync(BASE_DIR + '/LEIDING', 'utf-8');
    var leiding = authors(content);

    // Convert the 'url' field to 'nick' field.
    return new Map(leiding.map(l => [
        l.url,
        {
            name: l.name,
            email: l.email
        }
    ]));
}

/**
* Read the attendance file for the given month and year.
* Month starts is one-indexed. Value '1' corresponds to 'january', 
* value '12' corresponds to 'december'.
* 
* Each line should contain the attendance status ('-', 'v' or 'x') followed by
* the attendee's nickname, seperated by a single space.
* No empty lines please.
*
*
* The attendance file should contain the nickname (in upper, lower or correct case, it is compared case insensitive).
* The attendance file can have a BOM indicator. It won't interfere with the correct workings of the program.
*/
function readAttendenceFile(year, month, callback){
    var fileName = ATTENDENCE_ROOT_DIR + `/${year}/${year}-${month}/aanwezigen.txt`;
    var content = fs.readFileSync(fileName, 'utf8');
    
    // Array of people who have been naughty and should receive a notice.
    var toBeNotified = [];
    
    var lineReader = readline.createInterface(
        {input: fs.createReadStream(fileName)}
    );
    
    lineReader.on('close', () => {
        if(toBeNotified.length === 0){
            console.log("Everybody filled in his or hers attendance. It's a miracle!");
        }
        callback(toBeNotified);
    });
    
    lineReader.on('line', (line) => {
        line = line.replace(/^\uFEFF/, ''); // Remove BOM indicator.
        
        // Example line: "v Vincent"
        var status = line.substring(0, 1); // Strip the first character.
        
        if(status === '-'){
            var name = line.substring(2)
                           .toLowerCase()
                           .replace(/é/g, "e");
            
            toBeNotified.push(name);
            console.log(`[LAIKA] ${name} didn't fill in his/her attendance!`);
        }
    });
}

function generateToken(){
    const buffer = require('crypto').randomBytes(12);
    var token = buffer.toString('hex');
    return token;
}

/**
* Does the very important stuff.
*
*/
function doMain(auth) {
    var now = new Date();
    
    var year = now.getFullYear();
    var month= ("0" + (now.getMonth()+1) ).slice(-2);
    console.log(`Laika is searching for ${year}/${month}`);

    console.log(`Laika is writing a config file to ~/bin/config.json`);
    let config = {
        "event" : `${year}-${month}`,
        "token" : generateToken()
    }
    var json = JSON.stringify(config);
    fs.writeFile(BASE_DIR+'/bin/config.json', json, 'utf8', function(){});
    
    readAttendenceFile(
        year, month,
        (toBeNotified) => {
            toBeNotified.forEach((notifee) => {
                var email = leiding.get(notifee).email;
                var activiteit = `${year}-${month}`;
                var message = `Laika zag dat je jouw aanwezigheid voor ${activiteit} nog niet ingevuld hebt! Vergeet dit niet te doen.\n`
                message += `[Aanwezig](http://laika-attendance.now.sh/${notifee}?state=confirmed&token=${config.token})\n`
                message += `[Niet Aanwezig](http://laika-attendance.now.sh/${notifee}?state=absent&token=${config.token})\n`
                
                mail.sendMessage(auth, MAILER, email, message);
            });
        }
    );
}
