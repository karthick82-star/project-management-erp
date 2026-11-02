const fs = require('fs');
const path = require('path');
const express = require('express');
const app = require('./app');

// Serve frontend static assets in local development mode
const frontendPath = path.join(__dirname, '..', 'frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'login.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎓 College ERP System running at http://localhost:${PORT}`);
  console.log(`📦 MongoDB Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/campuserp'}`);
  console.log(`====================================================`);
});
