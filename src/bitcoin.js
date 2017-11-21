var http = require('http');

function send_to_bitcoind(raw_tx, callback) {
    //communication w/ bitcoind rpc

}

function decode(raw_tx, callback) {
    var post_body = {
        'jsonrpc': 1,
        'method': 'decoderawtransaction',
        'params': [ raw_tx ]
    };

    var rpc_username = "user";
    var rpc_password = "pass";
    var authorization_str = "Basic " + new Buffer(rpc_username + ":" + rpc_password).toString('base64');

    var post_options = {
        host: 'localhost',
        port: '18332',
        method: 'POST',
        path: '/',
        headers: {
            "Content-Type": 'text/plain',
            "Content-Length": JSON.stringify(post_body).length,
            "Authorization": authorization_str
        }
    };

    var post_request = http.request(post_options, function(res) {
        var response = '';
        
        res.on('data', function(chunk) {
            response += chunk;
        });

        res.on('end', function() {
            res;
            var res_obj = JSON.parse(response);
            if (res_obj.error === null) {
                console.log(res_obj.result);
                callback(res_obj.result);
            }
        });
    });

    post_request.write(JSON.stringify(post_body));
    post_request.end();
}

module.exports.send_to_bitcoind = send_to_bitcoind;
module.exports.decode = decode;