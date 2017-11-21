var http = require('http');

function get_post_options(body_length) {
    //need to include rpc username and password in Authorization header 
    const rpc_username = "user";
    const rpc_password = "pass";
    const authorization_str = "Basic " + new Buffer(rpc_username + ":" + rpc_password).toString('base64');
    
    var post_options = {
        host: 'localhost',
        port: '18332', //test port
        method: 'POST',
        path: '/',
        headers: {
            "Content-Type": 'text/plain',
            "Content-Length": body_length,
            "Authorization": authorization_str
        }
    };

    return post_options;
}

function send_rawtx(raw_tx, callback) {
    var post_body = {
        'jsonrpc': 1,
        'method': 'sendrawtransaction',
        'params': [ raw_tx ]
    };

    var body_length = JSON.stringify(post_body).length;

    var post_request = http.request(get_post_options(body_length), function(res) {
        var response = '';
        
        res.on('data', function(chunk) {
            response += chunk;
        });

        res.on('end', function() {
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

function decode(raw_tx, callback) {
    var post_body = {
        'jsonrpc': 1,
        'method': 'decoderawtransaction',
        'params': [ raw_tx ]
    };

    var body_length = JSON.stringify(post_body).length;

    var post_request = http.request(get_post_options(body_length), function(res) {
        var response = '';
        
        res.on('data', function(chunk) {
            response += chunk;
        });

        res.on('end', function() {
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

module.exports.send_rawtx = send_rawtx;
module.exports.decode = decode;