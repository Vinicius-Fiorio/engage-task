require('dotenv').config();
const fs = require('fs');
const puppeteer = require("puppeteer");

//os textos que vão aparecer nos comentários(escolhido de forma aleatória)
const texts = [
  "perfect",
  "great",
  "amazing",
  "LFG",
  "Insane"
]

//tweets para reply/like/retweet
const tweets = [
  "https://twitter.com/TropadaDrih/status/1741213001619783749",
]

//quantas contas você quer que faça esse engage ao msm tempo
const bulkAccounts = 2;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min)) + min;
}

async function loginTwitter(page, username, password){
  try {
    await page.goto('https://twitter.com/i/flow/login',{waitUntil: "networkidle0"});

    const inputUsername = await page.waitForXPath('//*[@id="layers"]/div/div/div/div/div/div/div[2]/div[2]/div/div/div[2]/div[2]/div/div/div/div[5]/label/div/div[2]/div/input');
    await inputUsername.click();
    await inputUsername.type(username)

    await page.keyboard.press('Enter');
    await sleep(1510);

    await page.keyboard.type(password);
    await sleep(1600);

    await page.keyboard.press('Enter');

    await page.waitForXPath('/html/body/div[1]/div/div/div[2]/header/div/div/div/div[2]/div/div/div[2]/div/div[2]/div/div/div/span');
    const userElement = await page.$x('/html/body/div[1]/div/div/div[2]/header/div/div/div/div[2]/div/div/div[2]/div/div[2]/div/div/div/span');
    
    const user = await page.evaluate(span => span.textContent, userElement[0]);

    if(user.replace("@","") == username)
      return true;

    return false
  } catch (error) {
    return false
  }
}

async function likeRetweet(browser, url){
  const page = await browser.newPage()
  let urlSplited = url.split("/");
  const tweetID = urlSplited[urlSplited.length - 1];

  try {
    await page.goto(url);
    await page.goto(`https://twitter.com/intent/retweet?tweet_id=${tweetID}`);

    await sleep(8000);
    await page.keyboard.press('Enter');
    await sleep(1000);

    await page.goto(`https://twitter.com/intent/like?tweet_id=${tweetID}`);

    await sleep(8000);
    await page.keyboard.press('Enter');
    await sleep(1000);

    await page.close();

    return true;
  } catch (error) {
    await page.close();
    return false;
  }
}

async function comment(browser, url, textComment, stop=false){
  const page = await browser.newPage()

  try {
    await page.goto(url);

    const folderPath = './images';
    const fileList = fs.readdirSync(folderPath);
    const imagePath = `${folderPath}/${fileList[getRandomInt(0, fileList.length - 1)]}`

    await sleep(500);
    const element = await page.waitForXPath("//div[contains(@class, 'DraftEditor-root')]");
    await element.click();
    await sleep(300);

    await page.waitForSelector('input[type="file"][data-testid="fileInput"]');
    const inputUploadHandle = await page.$('input[type="file"][data-testid="fileInput"]');
    await inputUploadHandle.uploadFile(imagePath);
    await sleep(500);

    await element.click();
    await page.keyboard.type(textComment, {delay: 100});
    await sleep(500);

    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');

    await sleep(2000);
    await page.close();
  } catch (error) {
    await page.close();

    if(!stop){
      try {
        comment(browser, url, textComment, true)
      } catch (error) {
        console.log("Não foi possivel realizar engajemnto em uma das contas")
      }
    }

    return false;
  }
}

async function initEngage(index) {

  const browser = await puppeteer.launch({
    headless: false, 
    defaultViewport: null, 
    args: [`--window-size=1510,980`],
  });
  
  const page = await browser.pages()

  let loginSuccess = false;
  let attemps = 0;

  const usernames = process.env.USERNAMES_TWITTER.split(",")
  const passes = process.env.PASSWORDS_TWITTER.split(",")

  while(!loginSuccess){
    loginSuccess = await loginTwitter(page[0], usernames[index], passes[index]);
    attemps++;

    if(attemps == 2 && !loginSuccess)
      throw Error("Nao foi possivel logar na conta");
  }

  let i = 0;
  while (i < tweets.length) {

    try {
      let randomText = texts[getRandomInt(0, texts.length - 1)];
      await comment(browser, tweets[i], randomText)
      await likeRetweet(browser, tweets[i])

    } catch (error) {
      console.log(`${tweets[i]} Falhou`)
    }

    i++;
  }

  await browser.close();
}

async function main(){
  const accounts = process.env.USERNAMES_TWITTER.split(",").length;
  let used = 0;
  let bulk = 1;
  while(used < accounts){
    
    try {
      if(bulk == bulkAccounts || used == accounts - 1){
        bulk = 1;
        await initEngage(used);
      }else{
        initEngage(used);
        bulk++
      }
    } catch (error) {
      console.log(`Ocorreu um erro com a conta numero: ${used + 1}`)
    }
    
    used++
  }
}

main();
