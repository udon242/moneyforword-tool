import * as puppeteer from 'puppeteer';

const MF_URL = 'https://moneyforward.com';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

(async () => {
    try {
        // アクセス
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(`${MF_URL}/users/sign_in`, {
            waitUntil: 'networkidle2', // 画像, JSの読み込み後まで待つ
        });

        // Email, Passwordを入力
        await page.type('input[id="sign_in_session_service_email"]', LOGIN_EMAIL);
        await page.type('input[id="sign_in_session_service_password"]', LOGIN_PASSWORD);

        // ログインボタンをクリック
        await page.click('input[id="login-btn-sumit"]');

        // ページ遷移を待つ
        await page.waitForNavigation();
        await page.screenshot({
            path: 'screenshot/login.png',
        });

        // 家計ページへ遷移
        await page.goto(`${MF_URL}/cf`, {
            waitUntil: 'networkidle2',
        });

        await page.screenshot({
            path: 'screenshot/cf.png',
        });

        // evaluateでページ要素を抜き出す
        const monthlyTotalList = await page.evaluate(() => {
            const dataList: Array<String> = [];
            const nodeList = document.querySelectorAll('.js-monthly_total td');
            nodeList.forEach(_node => {
                const tdValue = _node.innerHTML;
                dataList.push(tdValue);
            });
            return dataList;
        });

        console.log(`今月の収入: ${monthlyTotalList[0]}`);
        console.log(`今月の支出: ${monthlyTotalList[2]}`);
        console.log(`今月の収支: ${monthlyTotalList[4]}`);

        /*
         * 収支内訳をスクレイピング 
         */
        await page.goto(`${MF_URL}/cf/summary`, {
            waitUntil: 'networkidle2',
        });

        const clip = await page.evaluate(s => {
            const nodeList = document.querySelectorAll('section#cache-flow');
            const { width, height, top: y, left: x } = nodeList[0].getBoundingClientRect();
            return { width, height, x, y }
        });
        const yPosition = (29 + 15) + (54 + 9);
        await page.screenshot({
            clip: {
                ...clip,
                y: clip.y + yPosition,
                height: clip.height - yPosition,
                width: clip.width - 70,
            },
            path: 'screenshot/cf_summary.png',
        });

        // ブラウザを閉じる
        await browser.close();
    } catch (error) {
        console.error('[Error]');
        console.error(error);
    }
})();
