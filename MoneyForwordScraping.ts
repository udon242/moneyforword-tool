import * as puppeteer from 'puppeteer';

const MF_URL = 'https://moneyforward.com';

export interface MonthlyTotal {
    income?: string;
    expenditure?: string;
    incomeAndExpenditure?: string;
}

export default class MoneyForwordScraping {
    /**
     * 今月の収支データを取得
     */
    async getMonthlyTotal(): Promise<MonthlyTotal> {
        const data: MonthlyTotal = {};

        // ブラウザを立ち上げる
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'] // Cloud Functionsで動かす場合には'--no-sandbox'が必須
        });

        try {
            // 新規ページを開く
            const page = await browser.newPage();

            // デバイス指定
            const devices = require('puppeteer/DeviceDescriptors');
            await page.emulate(devices['iPad Pro landscape']);

            // MoneyForwordへアクセス
            await page.goto(`${MF_URL}/users/sign_in`, {
                waitUntil: 'networkidle2', // 画像, JSの読み込み後まで待つ
            });
    
            // Email, Passwordを入力(環境変数から取得)
            await page.type('input[id="sign_in_session_service_email"]', process.env.LOGIN_EMAIL);
            await page.type('input[id="sign_in_session_service_password"]', process.env.LOGIN_PASSWORD);
            await page.screenshot({path: 'screenshot/01_login.jpg'});
    
            // ログインボタンをクリック
            await page.click('input[id="login-btn-sumit"]');
            await page.screenshot({path: 'screenshot/02_after_login.jpg'});
    
            // 家計ページへ遷移
            await page.goto(`${MF_URL}/cf`, {
                waitUntil: 'networkidle2',
            });
            await page.screenshot({path: 'screenshot/03_cf_page.jpg'});
    
            // ページ要素を抜き出す
            const monthlyTotalList = await page.evaluate(() => {
                const dataList: Array<String> = [];
                const nodeList: Array<Element> = Array.from(document.querySelectorAll('.js-monthly_total td'));
                nodeList.forEach(_node => {
                    const tdValue = _node.innerHTML;
                    dataList.push(tdValue);
                });
                return dataList;
            });
    
            // 収入
            data.income = monthlyTotalList[0] as string;
            // 支出
            data.expenditure = monthlyTotalList[2] as string;
            // 収支(余計な改行コードが付くため除去)
            data.incomeAndExpenditure = (monthlyTotalList[4] as string).replace(/\r?\n/g, '');;

            // ブラウザを閉じる
            await browser.close();
        } catch (error) {
            // とりあえずエラーログ
            console.error(error);
            await browser.close();
        }
        return data;
    }

    /**
     * 収支内訳のスクリーンショット保存
     */
    async getSummaryScreenShot(): Promise<void> {
        // MoneyForwordへアクセス
        const browser = await puppeteer.launch({
            args: ['--no-sandbox'] // Cloud Functionsで動かす場合には'--no-sandbox'が必須
        });
        const page = await browser.newPage();
        await page.goto(`${MF_URL}/cf/summary`, {
            waitUntil: 'networkidle2',
        });

        // スクリーンショットの座標を取得
        const clip = await page.evaluate(s => {
            const nodeList = document.querySelectorAll('section#cache-flow');
            const { width, height, top: y, left: x } = nodeList[0].getBoundingClientRect();
            return { width, height, x, y }
        });

        // Positionを微調整
        const yPosition = (29 + 15) + (54 + 9);

        // スクリーンショットを保存
        const screenShotPath = 'screenshot/cf_summary.png';
        await page.screenshot({
            clip: {
                ...clip,
                y: clip.y + yPosition,
                height: clip.height - yPosition,
                width: clip.width - 70,
            },
            path: screenShotPath,
        });
    }
}
