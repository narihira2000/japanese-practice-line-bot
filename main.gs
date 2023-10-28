const channelToken = '';
const sheetId = '';
const textType = ['いつ', 'だれ', 'どこ', '動詞ます'];
const textArr = [
  ['今（いま）', '朝（あさ）', '昼（ひる）', '夜（よる）', 'あした', 'あさって', '今週（こんしゅう）', '来週（らいしゅう）', 'ことし', '来年（らいねん）'],
  ['家族（かぞく）', '父（ちち）', '母（はは）', '兄（あに）', '姉（あね）', '弟（おとうと）', '妹（いもうと）', '友達（ともだち）', '恋人（こいびと）', 'ジョンさん'],
  ['大学（だいがく）', '教室（きょうしつ）', '食堂（しょくどう）', '部屋（へや）', 'トイレ', '会社（かいしゃ）', '家（いえ）', '学校（がっこう）', 'スーパー', '駅（えき）'],
  ['日本語を勉強します（にほんごをべんきょうします）', 'ご飯を食べます（ごはんをたべます）', 'コーヒーを飲みます（のみます）', '映画を見ます（えいがをみます）', '本を読みます（ほんをよみます）', '手紙を書きます（てがみをかきます）', 'りんごを買います（かいます）', '写真を撮ります（しゃしんをとります）', '宿題をします（しゅくだいをします）', 'テニスをします']
]
const textBetweenSentence = ['', 'と', 'で', '。'];

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
          "style": "secondary"
        }
      )
    }
  }
  return replyJson;
}

function replyMsg(userId, userMessage) {
  let SpreadSheet = SpreadsheetApp.openById(sheetId);
  let Sheet = SpreadSheet.getSheetByName('工作表1');
  let LastRow = Sheet.getLastRow();
  let status = 0;
  let sentence = '';

  // 尋找使用者資料
  let foundIndex = -1;
  for (var i = 2; i <= LastRow; i++) {
    let sheetUserId = Sheet.getRange(i, 1).getValue();
    if (userId === sheetUserId) {
      [status, sentence] = Sheet.getRange(i, 2, 1, 2).getValues()[0];
      foundIndex = i;
    }
  }

  // 未找到使用者，則新增一筆資料
  if (foundIndex === -1) {
    Sheet.getRange(LastRow + 1, 1, 1, 3).setValues([[userId, 0, '']])
    foundIndex = LastRow + 1;
  }

  // 開始時則初始化所有資料
  if (userMessage.includes('開始')) {
    status = 0;
    sentence = ''
  }
  // 亂輸入文字時
  else if (status === 0) {
    return {
      'type': 'text',
      'text': '請輸入開始以開始'
    };
  }

  let replyJson = [];
  if (status !== 0 && textArr[status - 1].indexOf(userMessage) === -1) {
    // 非目前狀態之選項內文字，要請使用者重新輸入
    replyJson.push(
      {
        'type': 'text',
        'text': '請重新點選以下文字按鈕'
      },
      {
        'type': 'flex',
        'altText': textType[status - 1],
        'contents': fillJson(textArr[status - 1], textType[status - 1])
      }
    );
  }
  else {
    // 回傳現階段組合的句子內容
    if (status !== 0) {
      sentence += userMessage + textBetweenSentence[status - 1];
      replyJson.push(
        {
          'type': 'text',
          'text': sentence,
        }
      );
    }

    // 組完句子時初始化並提示使用者重新遊玩
    if (status === textArr.length) {
      status = 0;
      sentence = '';
      replyJson.push({
        'type': 'text',
        'text': '恭喜完成句子，歡迎再次按下開始按鈕重新遊玩!',
        "quickReply": {
          "items": [{
            "type": "action",
            "action": {
              "type": "message",
              "label": "開始",
              "text": "開始"
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
          'altText': textType[status],
          'contents': fillJson(textArr[status], textType[status])
        });
      status++;
    }
  }

  // 將目前狀態與句子寫入檔案
  Sheet.getRange(foundIndex, 2, 1, 2).setValues([[status, sentence]]);

  return replyJson;

}

// 打LINE的API
function replyLine(channelToken, replyToken, messages) {
  var url = 'https://api.line.me/v2/bot/message/reply';
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
    // 加好友時傳送貼圖並加上quick reply bubble
    if (type === 'follow') {
      let message = [{
        'type': 'sticker',
        'packageId': '789',
        'stickerId': '10855',
        'quickReply': {
          "items": [
            {
              'type': 'action',
              'action': {
                'type': 'message',
                'label': '開始',
                'text': '開始'
              }
            },
          ]
        }
      }]
      replyLine(channelToken, replyToken, message);
    }
    // 當使用者傳送文字時進行處理
    else if (type === 'message') {
      let userMessage = msg.events[i].message.text;
      let message = replyMsg(userId, userMessage);
      replyLine(channelToken, replyToken, message);
    }
  }

}
