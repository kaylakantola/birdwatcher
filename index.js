const fs = require('fs-extra');
const fetch = require('node-fetch');
const {Storage} = require('@google-cloud/storage');
const Unsplash = require('unsplash-js').default;
const toJson = require('unsplash-js').toJson;
global.fs = fs
global.fetch = fetch;

const config = {
  UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
  GCS_BUCKET: process.env.GCS_BUCKET
}


const unsplash = new Unsplash({accessKey: config.UNSPLASH_ACCESS_KEY});
const storage = new Storage();

const buildBirdHtml = (urls, birdName) => {
  const images = urls.map(url => `<img src=${url} style="max-width:500px" alt=${birdName} />`).join()
  return `<!doctype html><html lang="en"><h1>${birdName} Pics</h1><body>${images}</body></html>`
}

async function uploadFile(filename, birdName) {
  await storage.bucket(config.GCS_BUCKET).upload(filename, {
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  return console.log(`Check out https://storage.cloud.google.com/${config.GCS_BUCKET}/${birdName}_pics.html`)
}


exports.helloBird = (message, context) => {
  const birdName = message.data
    ? Buffer.from(message.data, 'base64').toString()
    : 'cormorant';

  return unsplash.search.photos(birdName, 1, 10)
    .then(toJson)
    .then(({total, results}) => {
      console.log(`Hello, ${birdName}! We grabbed ${total} photos.`);

      const birdPics = results.map(result => result.urls.regular)

      const birdHTML = buildBirdHtml(birdPics, birdName)

      const tmpFile = `/tmp/${birdName}_pics.html`
      console.log("File name will be:", `${birdName}_pics.html`)

      return fs.outputFile(tmpFile, birdHTML).then(()=> uploadFile(tmpFile, birdName)).catch(console.warn)
    }).catch(console.warn)
};