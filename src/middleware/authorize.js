const { User } = require('../database/models');

// Middleware para verificar autorização por role
function authorize(roles = []) {
   return async (req, res, next) => {
      const user = await User.findByPk(req.userId);

      if (!user || !roles.includes(user.role)) {
         return res.status(403).json({ error: 'Acesso não permitido.' });
      }

      req.user = user; // Disponibiliza user completo com role
      next();
   };
}

module.exports = authorize;
