const channelToken = '';
const sheetId = '';

// 將選項組合成 flex message
function fillJson(textArr, textType) {
  let replyJson = {
    'type': 'carousel',
    'contents': []
  }
  // 每5個一組
  for (let i = 0, cnt = 0; i < textArr.length; i += 5, cnt++) {
    replyJson.contents.push({
      'type': 'bubble',
      'body': {
        'type': 'box',
        'layout': 'vertical',
        'contents': [{
          "type": "text",
          "text": textType,
          "margin": "none",
          "offsetStart": "sm"
        }]
      }
    })
    let textChunk = textArr.slice(i, i + 5);
    for (let j = 0; j < textChunk.length; j++) {
      replyJson.contents[cnt].body.contents.push(
        {
          "type": "separator",
          "margin": "md",
          "color": "#FFFFFF00"
        },
        {
          'type': 'button',
          'action': {
            'type': 'message',
            'label': textArr[i + j],
            'text': textArr[i + j],
          },
          "color": "#d4e3fc",
          "style": "secondary",
          "adjustMode": "shrink-to-fit"
        }
      )
    }
  }
  return replyJson;
}

function findSheetIndexByValue(value, sheet, lastRow, idColumn) {
  for (let i = 2; i <= lastRow; i++) {
    let sheetValue = sheet.getRange(i, idColumn).getValue();
    if (value === sheetValue) {
      return i;
    }
  }
  return -1;
}

function getAllSentenceType() {
  let SpreadSheet = SpreadsheetApp.openById(sheetId);
  let SentenceSheet = SpreadSheet.getSheetByName('句型');
  let SentenceLastRow = SentenceSheet.getLastRow();
  let sentenceTypeArr = SentenceSheet.getRange(2, 1, SentenceLastRow - 1, 1).getValues().flat();
  return sentenceTypeArr;
}

function sliceAllSentenceType(allSentenceType, limit) {
  // 超過60個句型時換另一個flex message
  let replyJson = [];
  for (let i = 0; i < allSentenceType.length; i += limit) {
    let sentenceTypeChunk = allSentenceType.slice(i, i + limit);
    let pageText = (allSentenceType.length > limit) ? (i / limit + 1).toString() : '';
    replyJson.push({
      'type': 'flex',
      'altText': `所有句型${pageText}`,
      'contents': fillJson(sentenceTypeChunk, `句型選項${pageText}`)
    })
  }
  return replyJson;
}

function replyMsg(userId, userMessage) {
  let SpreadSheet = SpreadsheetApp.openById(sheetId);
  let UserSheet = SpreadSheet.getSheetByName('user');
  let UserLastRow = UserSheet.getLastRow();
  let SentenceSheet = SpreadSheet.getSheetByName('句型');
  let SentenceLastCol = SentenceSheet.getLastColumn();
  let status = 0;
  let sentenceType = 0;
  let sentence = '';
  let replyJson = [];

  // 尋找使用者資料
  let userIndex = findSheetIndexByValue(userId, UserSheet, UserLastRow, 1);

  // 找到使用者，取得各種資訊
  if (userIndex !== -1) {
    [sentenceType, status, sentence] = UserSheet.getRange(userIndex, 2, 1, 3).getValues()[0];
  }
  // 未找到使用者，則新增一筆資料
  else {
    UserSheet.getRange(UserLastRow + 1, 1, 1, 4).setValues([[userId, 0, 0, '']]);
    userIndex = UserLastRow + 1;
  }

  // 重玩時則初始化所有資料
  if (userMessage.includes('再來一次')) {
    status = 0;
    sentenceType = 0;
    sentence = '';
    UserSheet.getRange(userIndex, 2, 1, 3).setValues([[sentenceType, status, sentence]]);
  }

  // 還沒進行句型選擇時
  if (sentenceType === 0) {
    let allSentenceType = getAllSentenceType();
    let sentenceTypeIndex = allSentenceType.indexOf(userMessage);
    // 亂輸入 or 再來一次時顯示所有句型選單
    if (sentenceTypeIndex === -1) {
      replyJson.push({
        'type': 'text',
        'text': '請選擇句型'
      });
      replyJson = replyJson.concat(sliceAllSentenceType(allSentenceType, 60));
      return replyJson;
    }
    // 設定句型
    else {
      sentenceType = sentenceTypeIndex + 2;
    }
  }

  // 句型處理
  let sentenceRow = SentenceSheet.getRange(sentenceType, 2, 1, SentenceLastCol).getValues()[0];
  let sentenceRowLastIndex = sentenceRow.findLastIndex((element) => element !== '');
  let textTypeArr = [];
  let textOptionArr = [];
  let textBetweenSentenceArr = [sentenceRow[0]];
  for (let i = 1; i<= sentenceRowLastIndex; i += 3){
    textTypeArr.push(sentenceRow[i]);
    textOptionArr.push(sentenceRow[i + 1].split(/[@＠]/));
    textBetweenSentenceArr.push(sentenceRow[i + 2]);
  }

  if (status !== 0 && textOptionArr[status - 1].indexOf(userMessage) === -1) {
    // 非目前狀態之選項內文字，要請使用者重新輸入
    replyJson.push(
      {
        'type': 'text',
        'text': '請重新點選以下文字按鈕'
      },
      {
        'type': 'flex',
        'altText': textTypeArr[status - 1],
        'contents': fillJson(textOptionArr[status - 1], textTypeArr[status - 1])
      }
    );
  }
  else {
    // 加上句首
    if (status === 0) {
      sentence = textBetweenSentenceArr[0];
    }
    // 回傳現階段組合的句子內容
    else {
      sentence += userMessage + textBetweenSentenceArr[status];
      replyJson.push(
        {
          'type': 'text',
          'text': sentence,
        }
      );
    }

    // 組完句子時初始化並提示使用者重新遊玩
    if (status === textOptionArr.length) {
      sentenceType = 0;
      status = 0;
      sentence = '';
      replyJson.push({
        'type': 'text',
        'text': '恭喜完成句子，歡迎再次按下再玩一次按鈕重新遊玩!',
        "quickReply": {
          "items": [{
            "type": "action",
            "action": {
              "type": "message",
              "label": "再玩一次",
              "text": "再玩一次"
            }
          }
          ]
        }
      });
    }
    // 將選項組合為flex message
    else {
      replyJson.push(
        {
          'type': 'flex',
          'altText': textTypeArr[status],
          'contents': fillJson(textOptionArr[status], textTypeArr[status])
        });
      status++;
    }
  }

  // 將目前狀態與句子寫入檔案
  UserSheet.getRange(userIndex, 2, 1, 3).setValues([[sentenceType, status, sentence]]);

  return replyJson;

}

// 打LINE的reply API
function replyLine(channelToken, replyToken, messages) {
  let url = 'https://api.line.me/v2/bot/message/reply';
  UrlFetchApp.fetch(url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + channelToken,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': messages
    }),
  });
}

// 打LINE的loading API
function loadingLine(channelToken, userId, duration) {
  let url = 'https://api.line.me/v2/bot/chat/loading/start';
  UrlFetchApp.fetch(url, {
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + channelToken,
    },
    'method': 'post',
    'payload': JSON.stringify({
      'chatId': userId,
      'loadingSeconds': duration
    }),
  })
}


function doPost(e) {
  let msg = JSON.parse(e.postData.contents);
  console.log(msg);

  // 依序取出 replyToken 和發送的訊息文字
  for (let i = 0; i < msg.events.length; i++) {
    let replyToken = msg.events[i].replyToken;
    let type = msg.events[i].type;
    let userId = msg.events[i].source.userId;
    if (typeof replyToken === 'undefined') {
      continue;
    }

    // 加好友時傳送貼圖並傳送句型選項
    if (type === 'follow') {
      loadingLine(channelToken, userId, 10);
      let allSentenceType = getAllSentenceType();
      let message = [{
        'type': 'sticker',
        'packageId': '789',
        'stickerId': '10855'
      }];
      message = message.concat(sliceAllSentenceType(allSentenceType, 60));
      replyLine(channelToken, replyToken, message);
    }
    // 當使用者傳送文字時進行處理
    else if (type === 'message') {
      loadingLine(channelToken, userId, 10);
      let userMessage = msg.events[i].message.text;
      let message = replyMsg(userId, userMessage);
      replyLine(channelToken, replyToken, message);
    }
  }

}
