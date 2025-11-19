// This file is a dummy entrypoint required by Vercel's build process 
// when using the 'api' directory for Serverless Functions.
// It is not actively used by the running API endpoints.

module.exports = (req, res) => {
    res.status(200).send("Cassidy Prime Tech Backend is Running. Access endpoints via /api/...");
};
