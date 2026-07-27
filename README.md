# Club Rihla — site du club de voyages

Site complet (frontend + backend + base de données) pour gérer des voyages :
les clients soumettent une demande via un formulaire, les places se
décomptent automatiquement, et si un voyage est complet le bouton devient
"Complet" pour tout nouveau visiteur. Un panneau admin (protégé par un vrai
mot de passe, pas juste un code affiché dans le code source) permet
d'ajouter/modifier/supprimer des voyages et de voir les demandes reçues.

## Comment c'est construit

- **Backend** : Node.js + Express (`server.js`), API sous `/api/...`
- **Base de données** : fichier JSON (`data/db.json`), créé automatiquement
  au premier démarrage — largement suffisant pour un club (des centaines de
  voyages/demandes). Peut être remplacé par Postgres plus tard si besoin.
- **Sécurité admin** : mot de passe haché (bcrypt) + session (JWT), jamais
  stocké en clair. Le mot de passe n'est jamais visible dans le code.
- **Frontend** : HTML/CSS/JS simple (`public/`), bilingue français/arabe,
  servi directement par le même serveur Express (un seul service à héberger).

## 1. Tester en local sur votre ordinateur

Il faut [Node.js](https://nodejs.org) installé (version 18 ou plus).

```bash
cd backend
npm install

# Choisissez votre mot de passe admin :
node scripts/set-admin-password.js "votre_mot_de_passe"
# → copiez la ligne ADMIN_PASSWORD_HASH affichée

cp .env.example .env
# → ouvrez .env et collez le ADMIN_PASSWORD_HASH généré,
#   et mettez une longue phrase aléatoire dans JWT_SECRET

npm start
```

Ouvrez `http://localhost:3000` dans votre navigateur.

## 2. Mettre le site en ligne (vous n'avez pas encore d'hébergement)

Le plus simple et gratuit pour démarrer : **Render.com** (offre gratuite,
pas besoin de carte bancaire pour un petit site comme celui-ci).

### Étape A — Mettre le code sur GitHub
1. Créez un compte sur [github.com](https://github.com) si vous n'en avez pas.
2. Créez un nouveau dépôt (repository), par exemple `club-rihla`.
3. Uploadez tout le contenu du dossier `backend/` dedans (GitHub propose un
   bouton "Upload files" si vous préférez ne pas utiliser la ligne de commande).

### Étape B — Créer le service sur Render
1. Créez un compte sur [render.com](https://render.com) (vous pouvez vous
   connecter directement avec GitHub).
2. Cliquez **New +** → **Web Service**.
3. Choisissez votre dépôt `club-rihla`.
4. Renseignez :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free
5. Dans l'onglet **Environment**, ajoutez ces variables (les mêmes que dans
   votre `.env` local) :
   - `JWT_SECRET` → une longue phrase aléatoire
   - `ADMIN_PASSWORD_HASH` → générez-le en local avec la commande de l'étape 1
     (`node scripts/set-admin-password.js "..."`) et collez le résultat
6. Cliquez **Create Web Service**. Après quelques minutes, Render vous donne
   une adresse du type `https://club-rihla.onrender.com` — c'est votre site,
   déjà en ligne et accessible à tout le monde.

⚠️ Sur l'offre gratuite de Render, le service "s'endort" après 15 minutes
sans visite et met ~30 secondes à se réveiller au premier visiteur suivant.
Pour un club avec un trafic modéré c'est généralement acceptable ; si ça vous
gêne, l'offre payante (à partir de quelques dollars/mois) supprime cette
limite.

### Étape C — Nom de domaine (optionnel)
Vous pouvez utiliser l'adresse gratuite `onrender.com`, ou acheter un nom de
domaine (ex. chez Namecheap ou OVH, environ 1000-1500 DA/an pour un `.com`)
et le connecter à Render dans l'onglet **Settings → Custom Domains** du
service.

## Sécurité — ce qui est déjà en place
- Mot de passe admin haché (bcrypt), jamais en clair
- Sessions admin par JWT avec expiration (12h)
- Toutes les routes de modification (`/api/admin/...`) exigent une session valide
- La réservation vérifie et décrémente les places de façon atomique côté
  serveur — impossible de dépasser la capacité même avec deux réservations
  simultanées

## Pour aller plus loin (si besoin plus tard)
- Notifications email à chaque nouvelle demande
- Export des demandes en Excel/CSV
- Plusieurs comptes admin avec des rôles différents
- Passer à une vraie base de données (Postgres) si le volume grandit beaucoup
