const express = require('express');

// This file is a dummy entrypoint required by Vercel's build process 
// when using the 'api' directory for Serverless Functions.
// It sets up a minimal Express app to satisfy the builder.

const app = express();

// A simple root handler. Vercel will ignore this in favor of your /api/ files.
app.get('/', (req, res) => {
    res.status(200).send('Cassidy Prime Tech Backend is Running. Access endpoints via /api/...');
});

// We export the Express app itself, which Vercel requires.
module.exports = app;
