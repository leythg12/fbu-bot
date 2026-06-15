# French Bee Virtual Discord Bot

## Configuration

1. Copier `.env.example` en `.env` et remplir les variables
2. `npm install`
3. `npm start`

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| DISCORD_TOKEN | Token du bot Discord |
| DISCORD_CLIENT_ID | ID de l'application Discord |
| DISCORD_GUILD_ID | ID de ton serveur Discord |
| PHPVMS_URL | URL du crew center (https://newhorisons.com) |
| PHPVMS_API_KEY | Clé API phpVMS (Admin → API Keys) |
| CHANNEL_PIREPS | ID du salon #pireps |
| CHANNEL_WELCOME | ID du salon #bienvenue |
| CHANNEL_ANNOUNCEMENTS | ID du salon #annonces |
| ROLE_PILOT | ID du rôle Pilote |
| ROLE_SENIOR | ID du rôle Senior FO |
| ROLE_CAPTAIN | ID du rôle Captain |
| ROLE_CHIEF | ID du rôle Chief Pilot |

## Commandes slash

| Commande | Description |
|----------|-------------|
| /pirep [count] | Derniers PIREPs acceptés |
| /roster | Roster des pilotes actifs |
| /flights [destination] | Vols disponibles |
| /stats | Statistiques de la VA |
| /pilote [id] | Infos sur un pilote |
| /metar [icao] | METAR d'un aéroport |
| /fbu | Infos French Bee Virtual |

## Webhooks (phpVMS → Discord)

| Endpoint | Event |
|----------|-------|
| POST /webhook/pirep | PIREP accepté/rejeté |
| POST /webhook/discord-linked | Compte Discord lié |
| POST /webhook/rank-changed | Changement de rang |
| POST /webhook/news | Nouvelle actualité |

## Déploiement Railway

1. Push ce dossier sur GitHub
2. Nouveau projet Railway → Deploy from GitHub
3. Ajouter les variables d'environnement
4. Railway détecte automatiquement Node.js
