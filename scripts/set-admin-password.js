// Génère le hash à mettre dans ADMIN_PASSWORD_HASH (fichier .env).
// Usage : node scripts/set-admin-password.js "votre_mot_de_passe"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Usage : node scripts/set-admin-password.js "votre_mot_de_passe"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nAjoutez cette ligne dans votre fichier .env :\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
