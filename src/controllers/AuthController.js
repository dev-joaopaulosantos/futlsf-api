require('dotenv').config();
const { User } = require('../database/models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Chaves secretas
const { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN } = process.env;

module.exports = {
   // Login do usuário - salva refresh token no banco
   async login(req, res) {
      try {
         const { email, password } = req.body;

         if (!email || !password) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
         }

         // Busca o usuário pelo e-mail
         const user = await User.findOne({ where: { email } });
         if (!user) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
         }

         // Verifica a senha
         const validPassword = await bcrypt.compare(password, user.password);
         if (!validPassword) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
         }

         // Gera o token de acesso incluindo role
         const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

         // Gera o refresh token e salva no banco
         const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
         await user.update({ refreshToken });

         // Retorna os dados do usuário sem a senha
         const userResponse = user.toJSON();
         delete userResponse.password;
         delete userResponse.refreshToken;

         return res.status(200).json({
            message: 'Login realizado com sucesso.',
            data: {
               user: userResponse,
               accessToken,
               refreshToken,
            },
         });
      } catch (error) {
         console.error('Erro ao fazer login:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },

   // Refresh token - verifica se o token existe no banco
   async refresh(req, res) {
      try {
         const { refreshToken } = req.body;

         if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token é obrigatório.' });
         }

         // Verifica a assinatura do token
         const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

         // Busca o usuário no banco para verificar se o token ainda é válido
         const user = await User.findByPk(decoded.userId);
         if (!user || !user.refreshToken) {
            return res.status(401).json({ error: 'Refresh token inválido.' });
         }

         // Verifica se o token enviado é o mesmo que está no banco
         if (user.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Refresh token expirado ou revogado.' });
         }

         // Gera um novo token de acesso incluindo role
         const newAccessToken = jwt.sign({ userId: decoded.userId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

         return res.status(200).json({
            message: 'Token atualizado com sucesso.',
            data: { accessToken: newAccessToken },
         });
      } catch (error) {
         console.log(error);
         return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
      }
   },

   // Logout - remove o refresh token do banco
   async logout(req, res) {
      try {
         // O ID do usuário virá do middleware de autenticação (req.userId)
         const userId = req.userId;

         const user = await User.findByPk(userId);
         if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
         }

         // Remove o refresh token do banco (invalida todas as sessões)
         await user.update({ refreshToken: null });

         return res.status(200).json({ message: 'Logout realizado com sucesso.' });
      } catch (error) {
         console.error('Erro ao fazer logout:', error);
         return res.status(500).json({ error: 'Erro interno do servidor.' });
      }
   },
};
