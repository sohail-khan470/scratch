res.set('Cache-Control', 'public, max-age=31557600, s-maxage=31557600'); 


  res.set('Cache-Control', 'public, max-age=31557600');

  app.use('/static', express.static('public', {
  maxAge: '1y', // Cache for 1 year
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      // HTML files should not be cached
      res.set('Cache-Control', 'no-store');
    } else {
      // Cache other static assets for 1 year
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

  app.get('/user-data', (req, res) => {
  res.set('Cache-Control', 'no-store'); // Prevent caching
  res.json({ user: 'John Doe', lastLogin: new Date() });
});


app.use((req, res, next) => {
  if (req.path.startsWith('/static')) {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year for static assets
  } else if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes for API responses
  } else {
    res.set('Cache-Control', 'no-store'); // No caching for other routes
  }
  next();
});