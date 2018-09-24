# Bitcoin Crowdfunding Web Platform

Bitcoin smart contracts as applied to the problem of crowdfunding. This is a crowdfunding web application built on top of Bitcoin platform, using an assurance contract protocol. The protocol was modified and extended to include additional features. The system leverages the benefits of smart contracts and the Bitcoin model, specifically the low trust in not
having to depend on some centralised body for monetary processing, and security from the cryptography used by Bitcoin, to make a trustless system with proactive prevention of breach of contract. 

Works on the bitcoin testnet. Built using Node.JS, ExpressJS, Bitcore-lib, MySQL. More documentation available in the `/docs` directory.

### Prerequisites
Need MySQL 5.7, Node.JS.

### Installing

The node dependencies are specified in package.json, install using: 

```
npm install
```

The `db_init.sql` script contains the schema, run it to create the database.

To start the application:
```
npm start
```
the server should be on localhost:3000.

### Building
Uses browserify. Build using:
```
npm build
```

