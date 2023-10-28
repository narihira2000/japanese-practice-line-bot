# japanese-practice-line-bot
一個透過GAS達成句子組合的Line bot

## 機器人網址
- [Line](https://page.line.me/556bldad)

## Screenshots
![](https://i.imgur.com/nbn0Bw4.png)

## 部署說明
- 所有需要的 `sheetId` 、 `channelToken` 皆放在各檔案的前幾行，請自行部署得到這些值後填入
- 要修改句子時，只要修改 `textType`、`textArr`、`textBetweenSentence` 即可修改為其他句型
- `main.gs`為`main.xlsx`的Google App Script，使用方法為新建一試算表後點上方選單列的`擴充功能>App Script`即可打開Google App Script
![](https://i.imgur.com/DScmMIN.png)
