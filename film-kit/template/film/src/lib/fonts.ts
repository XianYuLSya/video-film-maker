import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';

const handle = delayRender('加载字体');

Promise.all([
  loadFont({family: 'NotoSans', url: staticFile('fonts/NotoSansSC-VF.ttf'), weight: '100 900'}),
  loadFont({family: 'NotoSerif', url: staticFile('fonts/NotoSerifSC-VF.ttf'), weight: '200 900'}),
  loadFont({family: 'Inter', url: staticFile('fonts/Inter-latin.woff2'), weight: '100 900'}),
  loadFont({family: 'Inter', url: staticFile('fonts/Inter-latin-ext.woff2'), weight: '100 900'}),
  loadFont({family: 'JBMono', url: staticFile('fonts/JetBrainsMono.woff2'), weight: '100 800'}),
  loadFont({family: 'Kuaile', url: staticFile('fonts/ZCOOLKuaiLe-Regular.ttf')}),
  loadFont({family: 'Smiley', url: staticFile('fonts/SmileySans-Oblique.ttf')}),
])
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
