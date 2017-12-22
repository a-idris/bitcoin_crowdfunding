var http = require('http');

// creates post header for JSON-RPC request
function get_post_options(body_length) {
    //need to include rpc username and password in Authorization header 
    const rpc_username = "user";
    const rpc_password = "pass";
    const authorization_str = "Basic " + new Buffer(rpc_username + ":" + rpc_password).toString('base64');
    
    var post_options = {
        host: 'localhost',
        port: '18332', //rpc regtest port
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

//send raw_tx to the bitcoin node to be propagated to the network and stored on the blockchain
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
                callback(null, res_obj.result);
            } else {
                callback(res_obj.error);
            }
        });
    });

    post_request.write(JSON.stringify(post_body));
    post_request.end();
}

//get tx json object from raw_tx
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
                callback(null, res_obj.result);
            } else {
                callback(res_obj.error);
            }
        });
    });

    post_request.write(JSON.stringify(post_body));
    post_request.end();
}

//expose the functions
module.exports.send_rawtx = send_rawtx;
module.exports.decode = decode;