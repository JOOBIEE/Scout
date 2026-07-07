import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.SCOUT_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ authorized: true }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

export default router;