require("dotenv").config();

const { DB_USER, DB_PASS, DB_NAME, DB_HOST, DB_PORT } = process.env;

module.exports = {
  development: {
    username: DB_USER,
    password: DB_PASS || null,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    dialect: "mysql",
  },
  test: {
    username: DB_USER,
    password: DB_PASS || null,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    dialect: "mysql",
  },
  production: {
    // Em produção normalmente usamos um DATABASE_URL (ex: mysql://user:pass@host:port/db)
    // use_env_variable: DATABASE_URL ? "DATABASE_URL" : undefined,
    username: DB_USER,
    password: DB_PASS || null,
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT ? Number(DB_PORT) : 3306,
    dialect: "mysql",
  },
};
