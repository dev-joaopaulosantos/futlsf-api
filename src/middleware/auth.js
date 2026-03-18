const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
function authMiddleware(req, res, next) {
   const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

   if (!token) {
      return res.status(401).json({ error: 'Token não fornecido.' });
   }

   try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role; // Inclui role do token
      next();
   } catch (error) {
      console.log(error);

      return res.status(401).json({ error: 'Token inválido ou expirado.' });
   }
}

module.exports = authMiddleware;
