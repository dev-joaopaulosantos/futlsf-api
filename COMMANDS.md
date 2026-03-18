## Instalar CLI:
```bash
npm install --save-dev sequelize-cli
```

## Iniciar CLI:
```bash
 npx sequelize-cli init
```

## Criar uma migration:
```bash
npx sequelize-cli migration:generate --name <name>
```

## Executar migrations:
```bash
npx sequelize-cli db:migrate
```

## Desfaz ultima migration:
```bash
npx sequelize-cli db:migrate:undo
```

## Criar um seed:
```bash
npx sequelize-cli seed:generate --name <name>
```

## Executar seeders:
```bash
npx sequelize-cli db:seed:all
```
