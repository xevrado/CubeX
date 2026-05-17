const fs = require('fs');

try {
  // 1. update.json'dan ana sürümü oku
  const updateJson = JSON.parse(fs.readFileSync('./update.json', 'utf8'));
  const version = updateJson.version;

  // 2. game.js içindeki APP_VERSION'ı otomatik güncelle
  let gameJs = fs.readFileSync('./game.js', 'utf8');
  gameJs = gameJs.replace(/let APP_VERSION = "[^"]+";/, `let APP_VERSION = "${version}";`);
  fs.writeFileSync('./game.js', gameJs);

  // 3. sw.js içindeki önbelleği ve varlık sorgularını otomatik güncelle
  let swJs = fs.readFileSync('./sw.js', 'utf8');
  // CACHE_NAME güncelle
  swJs = swJs.replace(/const CACHE_NAME = 'cubex-v[^']+';/, `const CACHE_NAME = 'cubex-v${version}-p${Date.now()}';`);
  // ASSETS içindeki sorguları güncelle (?v=1.x.x.x)
  swJs = swJs.replace(/style\.css\?v=[^']+/g, `style.css?v=${version}`);
  swJs = swJs.replace(/game\.js\?v=[^']+/g, `game.js?v=${version}`);
  fs.writeFileSync('./sw.js', swJs);

  // 4. index.html içindeki style.css ve game.js sorgularını otomatik güncelle
  let indexHtml = fs.readFileSync('./index.html', 'utf8');
  indexHtml = indexHtml.replace(/style\.css\?v=[^"]+/g, `style.css?v=${version}`);
  indexHtml = indexHtml.replace(/game\.js\?v=[^"]+/g, `game.js?v=${version}`);
  fs.writeFileSync('./index.html', indexHtml);

  // 5. package.json versiyonunu otomatik eşitle
  let packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  packageJson.version = version;
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));

  // 6. version.txt eski sistemler için güncelle
  fs.writeFileSync('./version.txt', version);

  console.log("==== CUBEX BASARIYLA SENKRONIZE EDILDI ====");
  console.log("Yeni Surum: v" + version);
  console.log("Artik tum dosyalar (game.js, sw.js, index.html vb.) bu surume kilitlendi!");
} catch (e) {
  console.error("Senkronizasyon hatasi:", e);
}
