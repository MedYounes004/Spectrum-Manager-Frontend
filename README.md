# Spectrum Manager

Interface web Angular de **SFM Spectre**, une plateforme de gestion du spectre radioélectrique. L'application permet de suivre les clients, les autorisations, les factures, les rapports et les prévisions de recettes selon le rôle de l'utilisateur.

## Fonctionnalités

- Authentification et contrôle d'accès par rôle.
- Tableau de bord avec indicateurs d'activité et de recettes.
- Gestion des utilisateurs et des clients.
- Suivi des autorisations radioélectriques.
- Gestion des factures et de la tarification.
- Rapports et espace client.
- Prévisions de recettes par le service Python/FastAPI optionnel.

## Prérequis

- Node.js compatible avec Angular 18.
- npm.
- Un backend SFM Spectre accessible sur `http://localhost:8083`.
- Python 3.9+ et PostgreSQL uniquement pour le service de prévisions.

## Installation

```bash
npm install
```

## Développement

Lancer le serveur Angular :

```bash
npm start
```

L'application est disponible à l'adresse [http://localhost:4200](http://localhost:4200). En développement, les appels commençant par `/api` sont transmis au backend configuré dans `proxy.conf.json` (`http://localhost:8083`).

## Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm start` | Lance le serveur de développement |
| `npm run build` | Produit un build de production dans `dist/sfm-spectre` |
| `npm run watch` | Compile automatiquement en mode développement |
| `npm test` | Lance les tests unitaires avec Karma |

## Modules et rôles

| Module | Rôles autorisés |
| --- | --- |
| Tableau de bord, clients, rapports | `ADMIN`, `OPERATOR`, `SPECTRUM_MANAGER`, `FINANCE_MANAGER` |
| Utilisateurs | `ADMIN` |
| Autorisations | `ADMIN`, `OPERATOR`, `SPECTRUM_MANAGER` |
| Factures | `ADMIN`, `FINANCE_MANAGER` |
| Tarification et coûts | `ADMIN`, `FINANCE_MANAGER`, `SPECTRUM_MANAGER` |
| Prévisions | `ADMIN`, `SPECTRUM_MANAGER` |
| Espace client | `VIEWER`, `CLIENT` |

## Service de prévisions Python

Le dossier `python-forecasting/` contient un microservice FastAPI qui exploite PostgreSQL et des modèles Prophet/Régression linéaire.

```bash
cd python-forecasting
python -m venv .venv

# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
# .\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Documentation interactive : [http://localhost:8000/docs](http://localhost:8000/docs).

La connexion PostgreSQL peut être configurée avec `DATABASE_URL` ou les variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD`. Utilisez des variables d'environnement pour les environnements partagés et de production.

## Structure principale

```text
src/
├── app/
│   ├── components/       # En-tête et barre latérale
│   ├── guards/           # Authentification et autorisations par rôle
│   ├── pages/            # Écrans fonctionnels
│   └── services/         # Appels API et logique métier
└── styles.css            # Styles globaux
python-forecasting/       # Microservice optionnel de prévisions
public/                   # Logos et ressources statiques
```

## Build de production

```bash
npm run build
```

Les fichiers générés se trouvent dans `dist/sfm-spectre`. En production, configurez l'URL du gateway/backend selon l'environnement de déploiement au lieu d'utiliser le proxy de développement.
