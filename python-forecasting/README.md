# SFM Spectre — Microservice de Prévisions IA (Python FastAPI + ML)

Ce microservice se connecte à la base de données PostgreSQL de l'application **SFM Spectre** pour générer des prédictions sur les revenus et budgets futurs à l'aide de modèles de Machine Learning (**Facebook Prophet** / **Régression Linéaire**).

---

## 🚀 Installation & Démarrage Rapide

### 1. Prérequis
- Python 3.9+ installé
- Base PostgreSQL active sur `localhost:5432` avec la base `sfm_spectre` (ou selon `config.py`)

### 2. Créer un environnement virtuel & installer les dépendances
```bash
cd python-forecasting
python -m venv venv

# Sous Windows (PowerShell / CMD) :
.\venv\Scripts\activate

# Installer les dépendances :
pip install -r requirements.txt
```

### 3. Lancer le service FastAPI
```bash
uvicorn main:app --reload --port 8000
```
Le serveur sera disponible sur : **`http://localhost:8000`**

Documentation Swagger interactive : **`http://localhost:8000/docs`**

---

## 📡 Endpoints Disponibles

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/forecast/summary` | Résumé complet (prévisions globales, décomposition par service, historique) |
| `GET` | `/api/forecast/revenue` | Prévisions détaillées des recettes (mensuel + annuel + intervalles 95%) |
| `GET` | `/api/forecast/by-service` | Répartition prévisionnelle par service radioélectrique |
| `GET` | `/api/forecast/refresh` | Force le réentraînement immédiat du modèle IA (invalidation cache) |
| `GET` | `/api/forecast/health` | Vérification de connectivité & état de la base PostgreSQL |

---

## ⚙️ Configuration

Vous pouvez modifier les paramètres de connexion à PostgreSQL directement dans [config.py](file:///c:/Users/imene/Desktop/stage2026/sfmSpectre_frontend/python-forecasting/config.py) ou via les variables d'environnement suivantes :

| Variable | Valeur par défaut | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `DB_NAME` | `sfm_spectre` | Nom de la base de données |
| `DB_USER` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `2004` | Mot de passe |
