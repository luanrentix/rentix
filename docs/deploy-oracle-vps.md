# Deploy do Contrx na Oracle VPS

Servidor alvo:

- IP publico: `163.176.209.66`
- Usuario SSH: `ubuntu`
- Sistema: Ubuntu 24.04 ARM64
- Banco: Supabase mantido fora da VPS

## 1. DNS

No provedor DNS do dominio, aponte:

```txt
A  @    163.176.209.66
A  www  163.176.209.66
A  api  163.176.209.66
```

Aguarde a propagacao antes de emitir os certificados.

## 2. Liberar portas na Oracle

Na VCN/sub-rede da instancia, libere entrada TCP:

```txt
22
80
443
```

No Ubuntu, depois de conectar:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Instalar dependencias

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

Saia do SSH e entre novamente para o grupo `docker` valer.

## 4. Clonar o projeto

```bash
cd /opt
sudo git clone SEU_REPOSITORIO_GITHUB contrx
sudo chown -R ubuntu:ubuntu /opt/contrx
cd /opt/contrx
```

## 5. Configurar variaveis

Crie `contrx-backend/.env.production`:

```bash
nano contrx-backend/.env.production
```

Conteudo:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="SUA_DATABASE_URL_DO_SUPABASE"
DIRECT_URL="SUA_DIRECT_URL_DO_SUPABASE"
JWT_SECRET="UMA_CHAVE_GRANDE_E_FORTE"
JWT_EXPIRES_IN="1d"
CORS_ORIGINS="https://www.contrx.com.br,https://contrx.com.br"
CONTRX_CLEAN_PRODUCTION_KEEP_PROTECTED_USERS="true"
```

Crie `.env.production` na raiz:

```bash
nano .env.production
```

Conteudo:

```env
NEXT_PUBLIC_API_URL=https://api.contrx.com.br
```

## 6. Subir aplicacao

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
```

## 7. Configurar Nginx

Primeiro use a configuracao temporaria, sem SSL, para emitir os certificados:

```bash
sudo mkdir -p /var/www/certbot
sudo cp nginx/contrx.bootstrap.conf /etc/nginx/sites-available/contrx.conf
sudo ln -s /etc/nginx/sites-available/contrx.conf /etc/nginx/sites-enabled/contrx.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Emita os certificados:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d contrx.com.br -d www.contrx.com.br
sudo certbot certonly --webroot -w /var/www/certbot -d api.contrx.com.br
```

Depois ative a configuracao final:

```bash
sudo cp nginx/contrx.conf /etc/nginx/sites-available/contrx.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Validar

```bash
curl -I https://www.contrx.com.br
curl -I https://api.contrx.com.br
docker compose -f docker-compose.prod.yml logs --tail=80 backend
docker compose -f docker-compose.prod.yml logs --tail=80 frontend
```

## 9. Atualizar deploy depois

```bash
cd /opt/contrx
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f
```
