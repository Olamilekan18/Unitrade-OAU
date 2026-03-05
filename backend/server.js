require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const supabase = require('./config/supabaseClient');
const productRoutes = require('./routes/productRoutes');
const UserService = require('./services/UserService');
const CategoryService = require('./services/CategoryService');
const { errorHandler } = require('./middlewares/errorMiddleware');

const app = express();
const userService = new UserService(supabase);
const categoryService = new CategoryService(supabase);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'UniTrade API healthy' }));

app.post('/api/access-requests', async (req, res, next) => {
  try {
    const request = await userService.createAccessRequest(req.body);
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
});

app.post('/api/sessions', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await userService.getApprovedUserById(userId);

    const token = jwt.sign(
      { sub: user.id, email: user.oau_email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/sessions', (_req, res) => {
  res.clearCookie('access_token');
  res.json({ success: true, message: 'Logged out' });
});

app.get('/api/categories', async (_req, res, next) => {
  try {
    const categories = await categoryService.listCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

app.use('/api/products', productRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`UniTrade API listening on port ${PORT}`);
});
