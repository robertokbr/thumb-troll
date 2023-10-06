// import 'dotenv/config';
// import { updateThumb } from "./update-thumb";

import { renderHTML } from "./utils/render-html";
import path from 'node:path';

// updateThumb.execute();

const generateImageFromHTML = require('./utils/gen-image.js');

generateImageFromHTML(
  renderHTML({ comment: '', imageURL: '', name: '' }),
  path.resolve(__dirname, '..', 'image.png')
).then(console.log)
.catch(console.error);