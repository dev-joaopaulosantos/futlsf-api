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
npx sequelize-cli migration:generate --name <create-users>
```
## Executar migrations:
```bash
npx sequelize-cli db:migrate
```
## Executar seeders:
```bash
npx sequelize-cli db:seed:all
```
## Desfaz ultima migration:
```bash
npx sequelize-cli db:migrate:undo
``` 