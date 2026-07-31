# HourClick

Application PWA de gestion des heures de travail, conçue pour le travail en crèches.
Elle permet de planifier ses journées, pointer ses heures effectives, suivre les écarts, gérer les congés, calculer les kilomètres et exporter les relevés mensuels en PDF/CSV.

## Fonctionnalités

- **Multi-comptes locaux** avec authentification par mot de passe/PIN
- **Planning** des heures par crèche et par jour
- **Pointage** manuel ou par GPS
- **Pauses** prévues et réelles, prises en compte dans les écarts
- **Écarts** entre heures prévues et effectives
- **Congés** avec demi-journées et calcul des jours inclus
- **Itinéraires** vers les crèches du jour (OpenStreetMap, Google Maps, Waze)
- **Kilomètres aller-retour** depuis le domicile
- **Export PDF/CSV** mensuel
- **Thèmes** clair, sombre, forêt, rose
- **PWA** installable sur mobile et desktop
- **Synchronisation** via CouchDB/PouchDB

## Stack technique

- **Frontend** : React + Vite + TypeScript
- **Base de données locale** : PouchDB (IndexedDB)
- **Base de données serveur** : CouchDB
- **Carte** : Leaflet + OpenStreetMap
- **Génération de PDF** : jsPDF
- **Style** : CSS variables
- **Tests** : Vitest
- **Déploiement** : Docker Compose

## Prérequis

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- Un serveur avec un nom de domaine (facultatif, pour HTTPS)

## Installation locale

```bash
cd app
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

## Tests

```bash
cd app
npm test
```

## Production avec Docker Compose

1. Copier le fichier d'environnement :

```bash
cp .env.example .env
```

2. Modifier `.env` avec vos valeurs :

```env
COUCHDB_USER=admin
COUCHDB_PASSWORD=un_mot_de_passe_fort
HOURCLICK_HOST=votre-domaine.fr
```

3. Lancer les conteneurs :

```bash
docker compose up -d
```

4. Accéder à l'application :

```
http://votre-domaine.fr
```

## Structure

```
.
├── app/              # Application React/Vite
├── couchdb/          # Configuration CouchDB
├── docker-compose.yml
├── .env.example
└── README.md
```

## Sauvegarde

La base de données CouchDB est stockée dans le volume Docker `couchdb_data`. Pour sauvegarder :

```bash
docker exec -it hourclick_couchdb tar czf /tmp/backup.tar.gz /opt/couchdb/data
docker cp hourclick_couchdb:/tmp/backup.tar.gz ./backup-couchdb.tar.gz
```

## Notes

- L'authentification est **locale au navigateur** (PouchDB). Le compte CouchDB est utilisé pour la synchronisation entre appareils.
- Pour HTTPS, `docker-compose.yml` est prévu pour Caddy qui génère automatiquement les certificats Let's Encrypt.
