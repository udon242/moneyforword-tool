import MoneyForwordScraping from './MoneyForwordScraping';

(async () => {
    const moneyForwordScraping = new MoneyForwordScraping();
    const data = await moneyForwordScraping.getMonthlyTotal();
    console.log(data);
})();
