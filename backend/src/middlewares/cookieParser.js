// middleware/cookieParser.js
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// authController.js
const jwt = require('jsonwebtoken');

const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_SECRET = process.env.ACCESS_SECRET;

exports.refreshToken = (req, res) => {
  const token = req.cookies['refresh_token'];

  if (!token) return res.status(401).json({ message: 'No token' });

  jwt.verify(token, REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });

    const newAccessToken = jwt.sign({ id: user.id }, ACCESS_SECRET, { expiresIn: '15m' });

    res.json({ accessToken: newAccessToken });
  });
};
