/** 
 * Module storing config data.
 * @module config
*/

/**
 * @property {object} db Database config details
 * @property {string} db.host Database hostname
 * @property {string} db.user The database user to authenticate as
 * @property {string} db.password The user's password
 * @property {string} db.database Name of the database
 * @property {number} db.connectionLimit Connection pooling parameter - maximum number of connections to create at once
 * @property {object} session Session config details
 * @property {string} session.name Name of the session cookie
 * @property {string[]} session.keys List of keys to sign the session cookies
 * @property {string} network The Bitcoin network type e.g. 'livenet' for main network or 'testnet' for test network
 */
var config = {}

config.db = {
	host: "localhost",
	user: "aljan",
	password: "73SmKKaUEc@ZKz",
	database: "bitcoincrowdfund",
	connectionLimit: 30
}

config.session = {
	name: "session",
	keys: ["7U#ztuRAqb$ww9"]
}

config.network = "testnet";

module.exports = config