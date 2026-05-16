const fs = require('fs');

try {
  // 1. update.json'dan ana sürümü oku
  const updateJson = JSON.parse(fs.readFileSync('./update.json', 'utf8'));
  const version = updateJson.version;

  // 2. game.js içindeki APP_VERSION'ı otomatik güncelle
  let gameJs = fs.readFileSync('./game.js', 'utf8');
  gameJs = gameJs.replace(/let APP_VERSION = "[^"]+";/, `let APP_VERSION = "${version}";`);
  fs.writeFileSync('./game.js', gameJs);

  // 3. sw.js içindeki önbelleği otomatik kır (Web kullanıcıları anında güncellensin diye)
  let swJs = fs.readFileSync('./sw.js', 'utf8');
  swJs = swJs.replace(/const CACHE_NAME = 'cubex-v[^']+';/, `const CACHE_NAME = 'cubex-v${version}-p${Date.now()}';`);
  fs.writeFileSync('./sw.js', swJs);

  // 4. package.json versiyonunu otomatik eşitle
  let packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  packageJson.version = version;
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));

  // 5. version.txt eski sistemler için güncelle
  fs.writeFileSync('./version.txt', version);

  console.log("==== CUBEX BASARIYLA SENKRONIZE EDILDI ====");
  console.log("Yeni Surum: v" + version);
  console.log("Artik tum dosyalar (game.js, sw.js vb.) bu surume kilitlendi!");
} catch (e) {
  console.error("Senkronizasyon hatasi:", e);
}
