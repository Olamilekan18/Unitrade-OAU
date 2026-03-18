const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

async function verifyJwt(req, res, next) {
  const token = req.cookies?.access_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.jti) {
      const { data: isBlacklisted } = await supabase.from('blacklisted_tokens').select('id').eq('jti', payload.jti).maybeSingle();
      if (isBlacklisted) throw new Error('Blacklisted');
    }
    req.user = { id: payload.sub, email: payload.email };

    const { data, error } = await supabase
      .from('users')
      .select('access_status, is_blocked, suspended_until')
      .eq('id', payload.sub)
      .single();

    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }

    if (data.access_status !== 'approved') {
      return res.status(403).json({ success: false, message: 'Your access request is still pending approval.' });
    }

    if (data.is_blocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked.' });
    }

    if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
      return res.status(403).json({ success: false, message: 'Your account is currently suspended.' });
    }

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

async function requireAdmin(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, is_blocked, suspended_until')
      .eq('id', req.user.id)
      .single();

    if (error || !data) throw error || new Error('User not found');
    if (data.is_blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked.' });
    }
    if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
      return res.status(403).json({ success: false, message: 'Account is suspended.' });
    }
    if (!['admin', 'super_admin'].includes(data.role)) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    req.user.role = data.role;
    return next();
  } catch {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
}

async function requireSuperAdmin(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, is_blocked, suspended_until')
      .eq('id', req.user.id)
      .single();

    if (error || !data) throw error || new Error('User not found');
    if (data.is_blocked) {
      return res.status(403).json({ success: false, message: 'Account is blocked.' });
    }
    if (data.suspended_until && new Date(data.suspended_until) > new Date()) {
      return res.status(403).json({ success: false, message: 'Account is suspended.' });
    }
    if (data.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required.' });
    }
    req.user.role = data.role;
    return next();
  } catch {
    return res.status(403).json({ success: false, message: 'Super admin access required.' });
  }
}

module.exports = { verifyJwt, requireAdmin, requireSuperAdmin };
